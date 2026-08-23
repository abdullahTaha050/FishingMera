import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

export interface AccountStatus {
  configured: boolean;
  signedIn: boolean;
  isAnonymous: boolean;
  email: string | null;
}

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

export async function accountStatus(): Promise<AccountStatus> {
  const supabase = client();
  if (!supabase) return { configured: false, signedIn: false, isAnonymous: true, email: null };
  const result = await supabase.auth.getSession();
  const user = result.data.session?.user;
  return {
    configured: true,
    signedIn: Boolean(user),
    isAnonymous: user?.is_anonymous ?? true,
    email: user?.email ?? null
  };
}

export async function requestGuestEmailOtp(email: string): Promise<void> {
  const supabase = client();
  if (!supabase) throw new Error("BACKEND_NOT_CONFIGURED");
  const token = await guestAccessToken();
  if (!token) throw new Error("ANONYMOUS_SIGN_IN_FAILED");
  const result = await supabase.auth.updateUser({ email: email.trim().toLowerCase() });
  if (result.error) throw result.error;
}

export async function verifyGuestEmailOtp(email: string, token: string): Promise<AccountStatus> {
  const supabase = client();
  if (!supabase) throw new Error("BACKEND_NOT_CONFIGURED");
  const result = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: "email_change"
  });
  if (result.error) throw result.error;
  return accountStatus();
}

export async function requestExistingAccountOtp(email: string): Promise<void> {
  const supabase = client();
  if (!supabase) throw new Error("BACKEND_NOT_CONFIGURED");
  const result = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: false }
  });
  if (result.error) throw result.error;
}

export async function verifyExistingAccountOtp(email: string, token: string): Promise<AccountStatus> {
  const supabase = client();
  if (!supabase) throw new Error("BACKEND_NOT_CONFIGURED");
  const result = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: "email"
  });
  if (result.error) throw result.error;
  return accountStatus();
}

export async function deleteCloudAccount(): Promise<void> {
  const supabase = client();
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabase || !base || !anonKey) throw new Error("BACKEND_NOT_CONFIGURED");
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  if (!accessToken) throw new Error("AUTH_REQUIRED");
  const result = await fetch(`${base}/functions/v1/api/account/delete`, {
    method: "POST",
    headers: { apikey: anonKey, authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ confirmation: "HESABIMI SIL" })
  });
  if (!result.ok) {
    const body = await result.json().catch(() => ({})) as { code?: string };
    throw new Error(body.code ?? `ACCOUNT_DELETE_HTTP_${result.status}`);
  }
  await supabase.auth.signOut({ scope: "local" });
}
