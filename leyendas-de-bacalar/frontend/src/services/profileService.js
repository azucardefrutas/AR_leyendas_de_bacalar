import { getCurrentUser } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

const PROFILE_IMAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'legend-assets';
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function getClient() {
  if (!supabase) {
    return { data: null, error: getSupabaseConfigError() };
  }

  return { data: supabase, error: null };
}

export async function getCurrentProfile() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: userData, error: userError } = await getCurrentUser();
  if (userError) return { data: null, error: userError };
  if (!userData.user) return { data: null, error: null };

  return client
    .from('users_profile')
    .select('*')
    .eq('id', userData.user.id)
    .maybeSingle();
}

export async function updateCurrentProfile(payload) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: userData, error: userError } = await getCurrentUser();
  if (userError) return { data: null, error: userError };
  if (!userData.user) return { data: null, error: new Error('No authenticated user found.') };

  return client
    .from('users_profile')
    .upsert({ id: userData.user.id, ...payload })
    .select()
    .single();
}

function pickPayload(payload = {}, keys = []) {
  return keys.reduce((next, key) => {
    if (payload[key] !== undefined) next[key] = payload[key];
    return next;
  }, {});
}

function isMissingColumnError(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return message.includes('column') && (message.includes('does not exist') || message.includes('schema cache'));
}

function profileError(message, details = {}) {
  const error = new Error(message);
  Object.assign(error, details);
  return error;
}

async function getCurrentUserOrError() {
  const { data: userData, error: userError } = await getCurrentUser();
  if (userError) return { data: null, error: userError };
  if (!userData.user) return { data: null, error: new Error('No authenticated user found.') };
  return { data: userData.user, error: null };
}

export async function getCreatorProfile(userId) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };
  if (!userId) return { data: null, error: new Error('No se encontro el usuario del creador.') };

  const [profileResult, creatorResult, statsResult] = await Promise.all([
    client.from('users_profile').select('*').eq('id', userId).maybeSingle(),
    client.from('creator_profiles').select('*').eq('user_id', userId).maybeSingle(),
    getCreatorProfileStats(userId, client),
  ]);
  let creatorProfile = creatorResult.data ?? null;

  if (creatorProfile?.cover_asset_id) {
    const { data: coverAsset } = await client
      .from('assets')
      .select('*')
      .eq('id', creatorProfile.cover_asset_id)
      .maybeSingle();
    creatorProfile = {
      ...creatorProfile,
      coverAsset: coverAsset ?? null,
    };
  }

  return {
    data: {
      profile: profileResult.data ?? null,
      creatorProfile,
      stats: statsResult.data,
    },
    error: profileResult.error || creatorResult.error || statsResult.error || null,
  };
}

export async function getCurrentCreatorProfileBundle() {
  const { data: user, error: userError } = await getCurrentUserOrError();
  if (userError) return { data: null, error: userError };
  return getCreatorProfile(user.id);
}

export async function getCreatorProfileStats(userId, providedClient = null) {
  const client = providedClient ?? supabase;
  if (!client) return { data: null, error: getSupabaseConfigError() };
  if (!userId) return { data: null, error: new Error('No se encontro el usuario del creador.') };

  const { data, error } = await client
    .from('legends')
    .select('id, status')
    .eq('creator_id', userId);

  if (error) return { data: null, error };

  const rows = data ?? [];
  const counts = rows.reduce((summary, legend) => {
    const status = legend.status || 'draft';
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, {});

  return {
    data: {
      total: rows.length,
      published: counts.published || 0,
      inReview: (counts.in_review || 0) + (counts.submitted || 0) + (counts.changes_requested || 0),
      draft: (counts.draft || 0) + (counts.borrador || 0),
      rejected: counts.rejected || 0,
    },
    error: null,
  };
}

export async function updateCreatorProfile(userId, payload = {}) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };
  if (!userId) return { data: null, error: new Error('No se encontro el usuario del creador.') };

  const userProfilePayload = pickPayload(payload, ['full_name', 'username', 'avatar_url', 'bio']);
  const creatorBasePayload = pickPayload(payload, ['pen_name', 'biography']);
  const creatorExtendedPayload = pickPayload(payload, [
    'cover_asset_id',
    'headline',
    'location_label',
    'website_url',
    'profile_visibility',
  ]);
  let warning = null;

  const profileResult = Object.keys(userProfilePayload).length
    ? await client
      .from('users_profile')
      .update(userProfilePayload)
      .eq('id', userId)
      .select()
      .single()
    : { data: null, error: null };

  if (profileResult.error) return { data: null, error: profileResult.error };

  const creatorPayload = { ...creatorBasePayload, ...creatorExtendedPayload };
  let creatorResult = await client
    .from('creator_profiles')
    .update(creatorPayload)
    .eq('user_id', userId)
    .select()
    .single();

  if (creatorResult.error && Object.keys(creatorExtendedPayload).length && isMissingColumnError(creatorResult.error)) {
    warning = 'Campos extendidos pendientes de migracion; se guardaron los datos basicos del perfil.';
    creatorResult = await client
      .from('creator_profiles')
      .update(creatorBasePayload)
      .eq('user_id', userId)
      .select()
      .single();
  }

  if (creatorResult.error) return { data: null, error: creatorResult.error };

  return {
    data: {
      profile: profileResult.data,
      creatorProfile: creatorResult.data,
      warning,
    },
    error: null,
  };
}

function validateProfileImage(file) {
  if (!file) return profileError('Selecciona una imagen.');
  if (!IMAGE_TYPES.includes(file.type)) return profileError('Usa PNG, JPG o WebP.');
  if (file.size > 5 * 1024 * 1024) return profileError('La imagen supera 5 MB.');
  return null;
}

function safeFileName(name = 'perfil') {
  const extension = String(name).split('.').pop()?.toLowerCase() || 'jpg';
  const base = String(name)
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'perfil';
  return `${base}.${extension}`;
}

async function uploadCreatorProfileImage(file, folder) {
  const validationError = validateProfileImage(file);
  if (validationError) return { data: null, error: validationError };

  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: user, error: userError } = await getCurrentUserOrError();
  if (userError) return { data: null, error: userError };

  const path = `profiles/${user.id}/${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await client.storage
    .from(PROFILE_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return {
      data: null,
      error: profileError('No se pudo subir la imagen del perfil.', { supabaseError: uploadError }),
    };
  }

  const { data: publicData } = client.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(path);
  return {
    data: {
      bucket: PROFILE_IMAGE_BUCKET,
      path,
      publicUrl: publicData?.publicUrl || '',
    },
    error: null,
  };
}

export async function uploadCreatorAvatar(file) {
  return uploadCreatorProfileImage(file, 'avatar');
}

export async function uploadCreatorCover(file) {
  const uploadResult = await uploadCreatorProfileImage(file, 'cover');
  if (uploadResult.error) return uploadResult;

  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };
  const { data: user, error: userError } = await getCurrentUserOrError();
  if (userError) return { data: null, error: userError };

  const { data: asset, error: assetError } = await client
    .from('assets')
    .insert({
      uploaded_by: user.id,
      asset_type: 'banner',
      source_type: 'upload',
      file_url: uploadResult.data.publicUrl || null,
      storage_path: uploadResult.data.path,
      mime_type: file.type,
      file_size: file.size,
      metadata: {
        bucket: uploadResult.data.bucket,
        kind: 'creator_cover',
        original_name: file.name,
      },
    })
    .select()
    .single();

  if (assetError) {
    return {
      data: uploadResult.data,
      error: profileError('La portada subio, pero no se pudo registrar en assets.', { supabaseError: assetError }),
    };
  }

  return {
    data: {
      ...uploadResult.data,
      asset,
    },
    error: null,
  };
}
