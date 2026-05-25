import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

function getClient() {
  if (!supabase) {
    return { data: null, error: getSupabaseConfigError() };
  }

  return { data: supabase, error: null };
}

export async function signIn(email, password) {
  const { data: client, error } = getClient();
  if (error) return { data: null, error };

  return client.auth.signInWithPassword({ email, password });
}

export async function signUp(email, password, metadata = {}) {
  const { data: client, error } = getClient();
  if (error) return { data: null, error };

  return client.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
}

export async function signOut() {
  const { data: client, error } = getClient();
  if (error) return { data: null, error };

  return client.auth.signOut();
}

export async function getSession() {
  const { data: client, error } = getClient();
  if (error) return { data: { session: null }, error };

  return client.auth.getSession();
}

export async function getCurrentUser() {
  const { data: client, error } = getClient();
  if (error) return { data: { user: null }, error };

  return client.auth.getUser();
}

export function onAuthStateChange(callback) {
  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => {} } }, error: getSupabaseConfigError() };
  }

  return supabase.auth.onAuthStateChange(callback);
}
