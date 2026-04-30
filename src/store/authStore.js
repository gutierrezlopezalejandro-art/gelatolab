import { create } from 'zustand';
import { supabase, hasCloud } from '../lib/supabase';
import { setUserContext } from '../lib/errorLog';
import { track } from '../lib/analytics';

/**
 * Auth store. When Supabase is not configured, stays in anonymous mode
 * and all methods resolve with { error: 'Cloud not configured' }.
 */
async function fetchProfile(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('role, plan, display_name')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  hasCloud,

  async init() {
    if (!supabase) {
      set({ loading: false });
      return;
    }

    // Read current session
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    const profile = user ? await fetchProfile(user.id) : null;
    set({ session, user, profile, loading: false });
    setUserContext(user);

    // Subscribe to changes (login / logout / refresh)
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      const newUser = newSession?.user || null;
      const newProfile = newUser ? await fetchProfile(newUser.id) : null;
      set({ session: newSession, user: newUser, profile: newProfile });
      setUserContext(newUser);
      if (event === 'SIGNED_IN')  track('signed_in',  { provider: newUser?.app_metadata?.provider || 'email' });
      if (event === 'SIGNED_OUT') track('signed_out');
    });
  },

  async signUp(email, password, meta = {}) {
    if (!supabase) return { error: { message: 'Cloud not configured' } };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: meta,
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    return { data, error };
  },

  async signIn(email, password) {
    if (!supabase) return { error: { message: 'Cloud not configured' } };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  async signInWithGoogle() {
    if (!supabase) return { error: { message: 'Cloud not configured' } };
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { data, error };
  },

  async signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },

  async resetPassword(email) {
    if (!supabase) return { error: { message: 'Cloud not configured' } };
    // HashRouter + Supabase: Supabase appends its token hash to the URL, so we
    // point at the root and rely on App-level routing to send the user to
    // /reset-password when the PASSWORD_RECOVERY event fires.
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    return { data, error };
  },

  isLoggedIn() {
    return !!get().user;
  },

  isAdmin() {
    return get().profile?.role === 'admin';
  },
}));
