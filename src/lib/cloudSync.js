import { supabase } from './supabase';
import { logError } from './errorLog';

/**
 * Cloud sync layer — bidirectional sync between local Zustand stores and Supabase.
 *
 * Strategy:
 *   - On login: pull all cloud data, merge with local (cloud wins on conflict)
 *   - On local change: push to cloud (debounced)
 *   - On cloud change (realtime): update local store
 *
 * Tables on Supabase:
 *   - recipes           (user_id, data, updated_at)
 *   - ingredients       (user_id, data, updated_at)
 *   - productions       (user_id, data, updated_at)
 *   - plans             (user_id, data, updated_at)
 *
 * Each table uses `data` JSONB column to store the whole store state.
 * This is intentional for simplicity — can be normalized later.
 */

const TABLES = ['recipes', 'ingredients', 'productions', 'plans', 'inventory'];

export async function pullFromCloud(userId) {
  if (!supabase || !userId) return {};

  const result = {};
  try {
    for (const table of TABLES) {
      const { data, error } = await supabase
        .from(`user_${table}`)
        .select('data, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        logError(error, { source: 'pullFromCloud', table });
        continue;
      }
      if (data) result[table] = data;
    }
  } catch (e) {
    logError(e, { source: 'pullFromCloud' });
  }
  return result;
}

export async function pushToCloud(userId, table, data) {
  if (!supabase || !userId) return { error: 'No session' };

  try {
    const { error } = await supabase
      .from(`user_${table}`)
      .upsert(
        { user_id: userId, data, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    if (error) {
      logError(error, { source: 'pushToCloud', table });
      return { error };
    }
    return { success: true };
  } catch (e) {
    logError(e, { source: 'pushToCloud', table });
    return { error: e };
  }
}

/**
 * Debounced push — call this from stores when data changes.
 * Each queued push keeps a reference to the latest data so flushPendingPushes()
 * can send the up-to-date snapshot if the user saves/closes before the timer fires.
 */
const pushTimers = new Map();   // key -> timeoutId
const pushQueue  = new Map();   // key -> { userId, table, data }

export function debouncedPush(userId, table, data, delay = 2000) {
  if (!userId) return;
  const key = `${userId}:${table}`;
  if (pushTimers.has(key)) clearTimeout(pushTimers.get(key));
  pushQueue.set(key, { userId, table, data });
  const timer = setTimeout(() => {
    pushTimers.delete(key);
    const entry = pushQueue.get(key);
    pushQueue.delete(key);
    if (entry) pushToCloud(entry.userId, entry.table, entry.data);
  }, delay);
  pushTimers.set(key, timer);
}

/**
 * Cancel any pending debounce for (userId, table) and push immediately.
 * Use after explicit user actions (Save button) to guarantee the cloud is
 * updated before the user can navigate/close.
 */
export async function pushNow(userId, table, data) {
  if (!userId) return { error: 'No session' };
  const key = `${userId}:${table}`;
  if (pushTimers.has(key)) {
    clearTimeout(pushTimers.get(key));
    pushTimers.delete(key);
  }
  pushQueue.delete(key);
  return pushToCloud(userId, table, data);
}

/**
 * Flush all pending debounced pushes immediately (fire-and-forget).
 * Intended for beforeunload: runs synchronously by starting all pushes
 * without awaiting; the browser will keep the request in flight via
 * navigator.sendBeacon semantics of fetch keepalive if the runtime allows.
 */
export function flushPendingPushes() {
  for (const [key, timer] of pushTimers) {
    clearTimeout(timer);
    const entry = pushQueue.get(key);
    pushQueue.delete(key);
    if (entry) pushToCloud(entry.userId, entry.table, entry.data);
  }
  pushTimers.clear();
}

/** Returns true if there are pending pushes not yet sent. */
export function hasPendingPushes() {
  return pushTimers.size > 0;
}

/**
 * Subscribe to realtime changes for a user's tables.
 * Returns an unsubscribe function.
 */
export function subscribeToCloud(userId, onUpdate) {
  if (!supabase || !userId) return () => {};

  const channels = TABLES.map(table =>
    supabase
      .channel(`sync_${table}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: `user_${table}`, filter: `user_id=eq.${userId}` },
        (payload) => onUpdate(table, payload.new?.data)
      )
      .subscribe()
  );

  return () => {
    channels.forEach(ch => supabase.removeChannel(ch));
  };
}
