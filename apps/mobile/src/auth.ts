import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

let singleton: ReturnType<typeof createClient> | null = null;

function client() {
  if (singleton) return singleton;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  singleton = createClient(url, key, { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } });
  return singleton;
}

export async function guestAccessToken(): Promise<string | null> {
  const supabase = client();
  if (!supabase) return null;
  const current = await supabase.auth.getSession();
  if (current.data.session?.access_token) return current.data.session.access_token;
  const signedIn = await supabase.auth.signInAnonymously();
  if (signedIn.error) return null;
  return signedIn.data.session?.access_token ?? null;
}

