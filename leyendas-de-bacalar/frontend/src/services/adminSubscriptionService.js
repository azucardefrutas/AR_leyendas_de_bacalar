import { friendlyAdminError, getAdminClient } from './adminService.js';

export async function getAdminSubscriptionPlans() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  try {
    const { data, error } = await client
      .from('subscription_plans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
  } catch (error) {
    return { data: [], error: friendlyAdminError(error) };
  }
}

export async function getAdminSubscriptions() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  try {
    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
  } catch (error) {
    return { data: [], error: friendlyAdminError(error) };
  }
}
