import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Supabase client. Null when credentials are not configured — the app
 * then works in pure local mode (no auth, no cloud sync).
 */
export const supabase = (URL && ANON_KEY)
  ? createClient(URL, ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
        storageKey: 'gelatolab-auth',
      },
    })
  : null;

export const hasCloud = !!supabase;
