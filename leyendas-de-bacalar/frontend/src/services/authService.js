import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';
import { getSiteUrl } from '../utils/siteUrl.js';

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

export async function signUp(email, password) {
  const { data: client, error } = getClient();
  if (error) return { data: null, error };

  return client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });
}

export async function exchangeCodeForSession(code) {
  const { data: client, error } = getClient();
  if (error) return { data: null, error };
  if (!code) return { data: null, error: new Error('No pudimos confirmar tu sesion.') };

  return client.auth.exchangeCodeForSession(code);
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

// Change the signed-in user's password. Supabase's updateUser() only needs the
// active session, so we re-verify the CURRENT password first (via a sign-in) to
// stop someone from changing it on an unattended/hijacked session.
export async function changePassword({ currentPassword, newPassword }) {
  const { data: client, error } = getClient();
  if (error) return { error };

  const { data: userData } = await client.auth.getUser();
  const email = userData?.user?.email;
  if (!email) return { error: new Error('No hay una sesion activa. Inicia sesion de nuevo.') };

  const { error: verifyError } = await client.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) return { error: new Error('La contrasena actual no es correcta.') };

  const { error: updateError } = await client.auth.updateUser({ password: newPassword });
  if (updateError) return { error: updateError };

  return { error: null };
}

export function onAuthStateChange(callback) {
  if (!supabase) {
    return { data: { subscription: { unsubscribe: () => {} } }, error: getSupabaseConfigError() };
  }

  return supabase.auth.onAuthStateChange(callback);
}
