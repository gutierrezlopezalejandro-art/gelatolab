import { createClient } from '@supabase/supabase-js';
import { authStorage } from './authStorage';

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Supabase client. Null when credentials are not configured — the app
 * then works in pure local mode (no auth, no cloud sync).
 *
 * Uses a custom storage adapter (`authStorage`) so that on Tauri desktop
 * the auth session is mirrored into a file alongside localStorage. This
 * way the user stays logged in across auto-updates / NSIS reinstalls,
 * which sometimes wipe the WebView2 cache and would otherwise log the
 * user out.
 */
export const supabase = (URL && ANON_KEY)
  ? createClient(URL, ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: authStorage,
        storageKey: 'gelatolab-auth',
      },
    })
  : null;

export const hasCloud = !!supabase;
