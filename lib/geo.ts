export async function getCountryCode(): Promise<string | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.country_code ?? null;
  } catch {
    return null;
  }
}
