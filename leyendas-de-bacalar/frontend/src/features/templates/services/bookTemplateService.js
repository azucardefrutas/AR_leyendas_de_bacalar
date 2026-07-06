// Persists ONLY the reference to the template + the editable cover/back data on
// the legend (book). Pages stay in Editor.js (legend_pages). Reuses the existing
// creator update path (Supabase + RLS ownership) — no new backend needed.
import { getMyLegend, updateLegend } from '../../../services/creatorService.js';

export async function saveBookTemplate(legendId, { templateId, coverData, backCoverData } = {}) {
  const payload = {};
  if (templateId !== undefined) payload.cover_template_id = templateId;
  if (coverData !== undefined) payload.cover_data = coverData;
  if (backCoverData !== undefined) payload.back_cover_data = backCoverData;
  if (!Object.keys(payload).length) return { data: null, error: null };
  return updateLegend(legendId, payload);
}

export async function getBookTemplate(legendId) {
  const { data, error } = await getMyLegend(legendId);
  if (error) return { data: null, error };
  if (!data) return { data: null, error: null };
  return {
    data: {
      templateId: data.cover_template_id || null,
      coverData: data.cover_data || {},
      backCoverData: data.back_cover_data || {},
    },
    error: null,
  };
}
