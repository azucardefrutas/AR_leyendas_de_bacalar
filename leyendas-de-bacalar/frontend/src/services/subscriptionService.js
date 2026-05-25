import { getCurrentUser } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

export async function getActivePlans() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true);

  return { data: data ?? [], error };
}

export async function subscribe(planId, checkoutSnapshot, cardLastFour) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  return client.rpc('process_simulated_subscription', {
    p_plan_id: planId,
    p_checkout_snapshot: checkoutSnapshot,
    p_card_last_four: cardLastFour,
    p_grant_existing_subscription_legends: true,
  });
}

export async function getMySubscriptions() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data: userData, error: userError } = await getCurrentUser();
  if (userError) return { data: [], error: userError };
  if (!userData.user) return { data: [], error: null };

  const { data, error } = await client
    .from('subscriptions')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}
