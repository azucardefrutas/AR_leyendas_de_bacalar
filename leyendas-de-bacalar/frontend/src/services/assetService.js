import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

export async function getAssetsForLegend(legendId) {
  if (!supabase) return { data: [], error: getSupabaseConfigError() };

  const { data, error } = await supabase
    .from('legend_media')
    .select('*, assets(*)')
    .eq('legend_id', legendId);

  return { data: data ?? [], error };
}
