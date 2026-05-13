import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type ExternalAuthProviderId = 'supabase';

export interface ExternalAuthProviderStatus {
  id: ExternalAuthProviderId;
  label: string;
  configured: boolean;
  available: boolean;
  reason: string;
}

type EnvLike = Partial<Record<'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY', string>>;
const viteEnv = import.meta.env as unknown as EnvLike;

function envValue(env: EnvLike, name: keyof EnvLike): string | undefined {
  const value = env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function getExternalAuthProviderStatus(env: EnvLike = viteEnv): ExternalAuthProviderStatus {
  const hasUrl = !!envValue(env, 'VITE_SUPABASE_URL');
  const hasAnonKey = !!envValue(env, 'VITE_SUPABASE_ANON_KEY');
  const configured = hasUrl && hasAnonKey;

  return {
    id: 'supabase',
    label: 'Supabase',
    configured,
    available: configured,
    reason: configured
      ? 'Supabase Auth listo.'
      : 'Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
  };
}

function createSupabaseAuthClient(env: EnvLike = viteEnv): SupabaseClient | null {
  const url = envValue(env, 'VITE_SUPABASE_URL');
  const anonKey = envValue(env, 'VITE_SUPABASE_ANON_KEY');

  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

export async function startSupabaseLogin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = createSupabaseAuthClient();
  if (!client) {
    return { ok: false, error: 'Supabase Auth no esta configurado para este entorno.' };
  }

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getExternalAuthAccessToken(): Promise<string | null> {
  const client = createSupabaseAuthClient();
  if (!client) return null;

  const { data, error } = await client.auth.getSession();
  if (error) return null;
  return data.session?.access_token || null;
}

export async function signOutExternalAuth(): Promise<void> {
  const client = createSupabaseAuthClient();
  if (!client) return;
  await client.auth.signOut();
}
