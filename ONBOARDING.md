# RunCool - Onboarding Guide

## Cos'è RunCool
App React Native (Expo SDK 55) per tracciare alcol e sport tra amici. Ogni drink costa cuori, ogni sport ne fa guadagnare. Classifiche, clan, tandem e sfide.

## Tech Stack
- **Framework**: React Native + Expo SDK 55 + expo-router (file-based routing)
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime)
- **State**: React Context (AuthContext + AppContext)
- **Build**: EAS Build (preview=APK, production=store)
- **OTA Updates**: EAS Update → branch `production` (iOS + Android)

## Come pushare OTA (IMPORTANTE)
```powershell
npx eas-cli update --branch production --message "descrizione" --non-interactive --environment production
```
Sempre dal path principale: `C:\Users\MatteoDePasqual\Desktop\runcool`
NON dal worktree di Claude (`.claude/worktrees/...`).

## Struttura File Principali

### App Screens (`app/`)
- `app/(tabs)/index.tsx` — Home: punteggio, CTA drink/sport, tandem, clan, log recenti
- `app/(tabs)/two.tsx` — Log drink (con modal bottiglia di vino)
- `app/(tabs)/log-workout.tsx` — Log sport manuale
- `app/(tabs)/health-import.tsx` — Import da Apple Health / Google Health Connect
- `app/(tabs)/classifiche.tsx` — Classifiche singoli/tandem/clan (mese + sempre)
- `app/(tabs)/clan.tsx` — Gestione clan + sfide
- `app/(tabs)/tandem.tsx` — Gestione tandem + matchup settimanale
- `app/(tabs)/social.tsx` — Feed sociale
- `app/profilo.tsx` — Profilo (personale + pubblico via `?userId=xxx`)
- `app/mappa.tsx` — Mappa mondiale (paesi dove hai corso 10+ km)
- `app/(auth)/login.tsx` — Login/registrazione

### Context
- `context/AuthContext.tsx` — Auth Supabase, user, clan, tandem, avatar, username
- `context/AppContext.tsx` — Hearts, logs, logDrink(), logWorkout(), deleteLog()

### Constants (REGOLE DI SCORING)
- `constants/drinks.ts` — Definizioni drink con calorie e cuori persi
  - 1 cuore perso ogni 120 calorie (`CAL_PER_HEART_DRINK = 120`)
  - Birra piccola/media: 120 cal = 1 cuore
  - Cocktail: 240 cal = 2 cuori
  - Bottiglia vino: 720 cal = 6 cuori (divisibile tra persone)
- `constants/hearts.ts` — Calcolo cuori sport con calPerHeart PER SPORT:
  - Corsa: 120 cal/cuore
  - Pilates: 60 cal/cuore
  - Camminata: 240 cal/cuore
  - Default (tutti gli altri): 120 cal/cuore
- `constants/workouts.ts` — Sport disponibili con formule calorie:
  - Corsa: 60 cal/km
  - Camminata: 35 cal/km + 0.2 cal/m dislivello
  - Pilates: 4 cal/min
  - Tennis/Padel/Calcetto/etc: 7 cal/min (default)

### Lib
- `lib/supabase.ts` — Client Supabase
- `lib/health.ts` — Apple HealthKit + Google Health Connect integration
  - iOS: `@kingstinct/react-native-healthkit`
  - Android: `react-native-health-connect` con `aggregateRecord` per sessione
- `lib/mentality.ts` — Sistema ricompensa giornaliera (+1/4 cuore/giorno)
- `lib/geo.ts` — Reverse geocoding per country code
- `lib/notifications.ts` — Push notifications (sorpasso classifica, recap settimanale)

### Components
- `components/UserAvatar.tsx` — Avatar con foto profilo o fallback emoji

## Sistema Health Import
- **iOS**: HealthKit → `queryWorkoutSamples` + `totalDistance` (in metri, dividere per 1000)
- **Android**: Health Connect → `readRecords('ExerciseSession')` + `aggregateRecord` per calorie/distanza/dislivello per ogni sessione
- Le calorie da Health sono la fonte primaria per l'import. Solo se Health ha 0 calorie, ricalcola con formula RunCool.

## Regole Importanti
- **Solo numeri interi** nelle classifiche e punteggi (Math.round ovunque)
- **Classifiche**: solo "Mese" e "Sempre" (no settimana)
- **Profili cliccabili** ovunque (classifiche, clan, tandem, home) → `/profilo?userId=xxx`
- **Profilo pubblico vs privato**: stessa grafica, no edit/logout in pubblico
- **37 medaglie**: 13 attività + 24 classifica (oro/argento/bronzo × singoli/tandem/clan)
- **Mentality**: +1/4 cuore al primo accesso giornaliero, 4 giorni = +1 cuore intero

## Supabase Tables
- `profiles` — id, username, hearts, avatar_url, clan_id, tandem_id, push_token, rank_medals (jsonb)
- `logs` — id, user_id, type (drink/workout), item_id, calories, hearts_delta, km, elevation_meters, country_code, created_at
- `clans` — id, name, code, owner_id
- `tandems` — id, name, status (pending/active)
- `clan_challenges` — sfide tra clan

## Build & Deploy
- TypeScript check: `npx tsc --noEmit`
- OTA: `npx eas-cli update --branch production --message "..." --non-interactive --environment production`
- Build Android APK: `npx eas-cli build --platform android --profile preview`
- Build iOS: `npx eas-cli build --platform ios --profile production`
- Submit iOS: `npx eas-cli submit --platform ios --latest`
