import { friendlyAdminError, getAdminClient } from './adminService.js';

export async function getAssets() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('assets')
    .select('*')
    .order('created_at', { ascending: false });

  return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
}

export async function getLegendAssets(legendId) {
  if (!legendId) return { data: [], error: null };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('legend_media')
    .select('*, assets(*)')
    .eq('legend_id', legendId);

  return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
}
