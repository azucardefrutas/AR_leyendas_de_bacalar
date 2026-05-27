import { friendlyAdminError, getAdminClient } from './adminService.js';

export async function getAdminOrders() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  try {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
  } catch (error) {
    return { data: [], error: friendlyAdminError(error) };
  }
}

export async function getAdminPayments() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  try {
    const { data, error } = await client
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
  } catch (error) {
    return { data: [], error: friendlyAdminError(error) };
  }
}
