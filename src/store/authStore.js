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
    .select('role, plan, plan_expires_at, display_name, stripe_customer_id, stripe_subscription_id')
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
    // Limpiar estado local inmediatamente — no esperar la respuesta de Supabase.
    // Si el request falla (red caida, token ya expirado), el usuario igual
    // queda deslogueado en la app. onAuthStateChange puede disparar SIGNED_OUT
    // despues, pero el store ya esta limpio — no causa doble-clear.
    set({ user: null, session: null, profile: null });
    supabase.auth.signOut().catch(() => {});
  },

  // Borrado completo de cuenta (auth.users + tablas relacionadas via FK
  // ON DELETE CASCADE). Cumple requisito Apple App Store (sección 5.1.1(v)).
  // Llama a la edge function `delete-account` que usa service_role para
  // eliminar el usuario de auth.users.
  //
  // Después del borrado server-side, hacemos signOut local + retornamos
  // ok. El caller debe limpiar IndexedDB local y navegar fuera.
  async deleteAccount() {
    if (!supabase) return { error: { message: 'Cloud not configured' } };
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      return { error: { message: 'Not authenticated' } };
    }
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error) return { error };
      // Sign-out local y limpiar el store. Las tablas de Supabase ya se
      // borraron via cascade.
      await supabase.auth.signOut();
      set({ user: null, session: null, profile: null });
      return { data };
    } catch (e) {
      return { error: { message: String(e?.message || e) } };
    }
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
