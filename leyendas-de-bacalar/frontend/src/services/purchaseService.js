import { getCurrentUser } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

export async function getActiveProducts() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  // products exposes `status` (product_status enum), not `is_active`.
  // The RLS SELECT policy also filters on status = 'active'.
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('status', 'active')
    .order('price', { ascending: true });

  return { data: data ?? [], error };
}

export async function buyProduct(productId, checkoutSnapshot = {}, cardLastFour = '4242') {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  return client.rpc('process_simulated_product_purchase', {
    p_product_id: productId,
    p_checkout_snapshot: checkoutSnapshot,
    p_card_last_four: cardLastFour,
  });
}

export async function getMyOrders() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data: userData, error: userError } = await getCurrentUser();
  if (userError) return { data: [], error: userError };
  if (!userData.user) return { data: [], error: null };

  const { data, error } = await client
    .from('orders')
    .select('*, order_items(id, quantity, unit_price, subtotal, products(name, product_type))')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

export async function getMyPayments() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  // RLS restricts payments to rows whose order belongs to the current user.
  const { data, error } = await client
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}
