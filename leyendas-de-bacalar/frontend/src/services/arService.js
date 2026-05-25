import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

export async function getArMarkersForLegend(legendId) {
  if (!supabase) return { data: [], error: getSupabaseConfigError() };

  const { data, error } = await supabase
    .from('ar_markers')
    .select('*, ar_scenes(*)')
    .eq('legend_id', legendId);

  return { data: data ?? [], error };
}
