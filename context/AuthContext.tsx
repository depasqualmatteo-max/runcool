import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  clanId: string | null;
  avatarUrl: string | null;
}

export interface ClanMember {
  id: string;
  username: string;
  hearts: number;
  avatarUrl: string | null;
}

export interface Clan {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  members: ClanMember[];
}

interface AuthContextValue {
  user: AuthUser | null;
  clan: Clan | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createClan: (name: string) => Promise<void>;
  joinClan: (code: string) => Promise<void>;
  leaveClan: () => Promise<void>;
  refreshClan: () => Promise<void>;
  updateAvatar: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [clan, setClan] = useState<Clan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const registering = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserData(session.user.id, session.user.email!);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (registering.current) return;
        if (session?.user) {
          await loadUserData(session.user.id, session.user.email!);
        } else {
          setUser(null);
          setClan(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(userId: string, email: string) {
    setIsLoading(true);
    try {
      // Retry up to 3 times in case the trigger hasn't fired yet
      let profile = null;
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (data) { profile = data; break; }
        await new Promise((r) => setTimeout(r, 600));
      }
      if (!profile) { setIsLoading(false); return; }

      const authUser: AuthUser = {
        id: userId,
        email,
        username: profile.username,
        clanId: profile.clan_id,
        avatarUrl: profile.avatar_url ?? null,
      };
      setUser(authUser);

      if (profile.clan_id) {
        await loadClan(profile.clan_id);
      } else {
        setClan(null);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function loadClan(clanId: string) {
    const { data: clanData } = await supabase
      .from('clans')
      .select('*')
      .eq('id', clanId)
      .single();

    if (!clanData) { setClan(null); return; }

    const { data: members } = await supabase
      .from('profiles')
      .select('id, username, hearts, avatar_url')
      .eq('clan_id', clanId);

    setClan({
      id: clanData.id,
      name: clanData.name,
      code: clanData.code,
      ownerId: clanData.owner_id,
      members: (members ?? []).map((m) => ({
        id: m.id,
        username: m.username,
        hearts: m.hearts,
        avatarUrl: m.avatar_url ?? null,
      })),
    });
  }

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(
        error.message.includes('Invalid login credentials')
          ? 'Email o password errata'
          : error.message
      );
    }
  }

  async function register(email: string, username: string, password: string) {
    registering.current = true;
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          throw new Error('Email già registrata');
        }
        throw new Error(error.message);
      }
      if (!data.session) {
        throw new Error('Controlla la tua email per confermare la registrazione');
      }
      await loadUserData(data.user!.id, email);
    } finally {
      registering.current = false;
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setClan(null);
  }

  async function createClan(name: string) {
    if (!user) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: clanData, error } = await supabase
      .from('clans')
      .insert({ name, code, owner_id: user.id })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await supabase
      .from('profiles')
      .update({ clan_id: clanData.id })
      .eq('id', user.id);

    const updatedUser = { ...user, clanId: clanData.id };
    setUser(updatedUser);
    await loadClan(clanData.id);
  }

  async function joinClan(code: string) {
    if (!user) return;

    const { data: clanData, error } = await supabase
      .from('clans')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .single();

    if (error || !clanData) throw new Error('Codice clan non trovato');

    await supabase
      .from('profiles')
      .update({ clan_id: clanData.id })
      .eq('id', user.id);

    setUser({ ...user, clanId: clanData.id });
    await loadClan(clanData.id);
  }

  async function leaveClan() {
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ clan_id: null })
      .eq('id', user.id);

    setUser({ ...user, clanId: null });
    setClan(null);
  }

  async function refreshClan() {
    if (user?.clanId) await loadClan(user.clanId);
  }

  async function updateAvatar(url: string) {
    if (!user) return;
    setUser((prev) => prev ? { ...prev, avatarUrl: url } : prev);
  }

  return (
    <AuthContext.Provider
      value={{ user, clan, isLoading, login, register, logout, createClan, joinClan, leaveClan, refreshClan, updateAvatar }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
