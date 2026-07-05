// Cover templates library (Fase 2). Reads system + own templates through RLS,
// lets creators save/delete their own, and applies a designed cover to a legend
// by reusing the existing cover pipeline (saveLegendResource -> legend_media).
import { supabase } from '../lib/supabaseClient.js';
import { saveLegendResource } from './assetService.js';
import { renderCoverToFile } from '../utils/coverRenderer.js';

function normalizeError(error, fallback) {
  if (!error) return null;
  const normalized = new Error(error.message || fallback);
  normalized.cause = error;
  return normalized;
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return { userId: null, error: normalizeError(error, 'Sesión no disponible.') };
  return { userId: data?.user?.id || null, error: null };
}

// Returns { data: templates[], error }. RLS returns system templates + the
// current creator's own templates only.
export async function listCoverTemplates() {
  const { data, error } = await supabase
    .from('cover_templates')
    .select('*')
    .eq('is_active', true)
    .order('scope', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return { data: [], error: normalizeError(error, 'No se pudieron cargar las plantillas.') };
  return { data: data || [], error: null };
}

// Persists a creator-owned template so it can be reused across legends.
export async function saveCoverTemplate({ name, config }) {
  const { userId, error: userError } = await getCurrentUserId();
  if (userError) return { data: null, error: userError };
  if (!userId) return { data: null, error: new Error('Debes iniciar sesión para guardar plantillas.') };
  if (!name?.trim()) return { data: null, error: new Error('Ponle un nombre a la plantilla.') };

  const { data, error } = await supabase
    .from('cover_templates')
    .insert({ name: name.trim(), scope: 'creator', owner_id: userId, config: config || {} })
    .select('*')
    .single();
  if (error) return { data: null, error: normalizeError(error, 'No se pudo guardar la plantilla.') };
  return { data, error: null };
}

export async function deleteCoverTemplate(templateId) {
  if (!templateId) return { data: null, error: new Error('Plantilla inválida.') };
  const { error } = await supabase.from('cover_templates').delete().eq('id', templateId);
  if (error) return { data: null, error: normalizeError(error, 'No se pudo eliminar la plantilla.') };
  return { data: { id: templateId }, error: null };
}

// Renders the designed cover to a PNG and stores it as the legend cover through
// the existing pipeline, so it shows in card/detail/reader with no other changes.
export async function applyCoverToLegend({ legendId, config, fields }) {
  if (!legendId) return { data: null, error: new Error('Falta la leyenda.') };
  let file;
  try {
    file = await renderCoverToFile(config, fields, 'portada.png');
  } catch (renderError) {
    return { data: null, error: normalizeError(renderError, 'No se pudo generar la portada.') };
  }
  return saveLegendResource({
    legendId,
    resource: {
      key: 'cover',
      kind: 'media',
      assetType: 'cover',
      mediaType: 'cover',
      file,
    },
  });
}
