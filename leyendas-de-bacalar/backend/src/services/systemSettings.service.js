import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { SITE_ACCESS_MODES, normalizeSiteAccess } from './siteAccessPolicy.js';

class SystemSettingsError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'SystemSettingsError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Whitelist of known settings + their public visibility and default shape. Unknown keys
// are ignored on write, so the admin form can never inject arbitrary keys, and every
// stored value is sanitized to a known shape below.
const SETTINGS = {
  announcement: { isPublic: true, default: { enabled: false, message: '', type: 'info' } },
  maintenance: { isPublic: true, default: { enabled: false, message: '' } },
  site_access: { isPublic: true, default: { mode: SITE_ACCESS_MODES.OPEN, message: '' } },
  creator_registration: { isPublic: true, default: { open: true } },
  upload_limit_mb: { isPublic: false, default: { value: 50 } },
};

const KNOWN_KEYS = Object.keys(SETTINGS);
const HARD_UPLOAD_LIMIT_MB = 50;

const rowsToMap = (rows = [], { publicOnly = false } = {}) => {
  const map = {};
  for (const key of KNOWN_KEYS) {
    if (publicOnly && !SETTINGS[key].isPublic) continue;
    map[key] = SETTINGS[key].default;
  }
  for (const row of rows) {
    if (!KNOWN_KEYS.includes(row.key)) continue;
    if (publicOnly && !SETTINGS[row.key].isPublic) continue;
    map[row.key] = row.value ?? SETTINGS[row.key].default;
  }
  return map;
};

export const getAllSettings = async () => {
  const { data, error } = await supabaseAdmin
    .from('system_settings')
    .select('key, value, is_public, updated_at');
  if (error) throw new SystemSettingsError('Could not load settings.', 500, { reason: error.message });
  return rowsToMap(data);
};

export const getPublicSettings = async () => {
  const { data, error } = await supabaseAdmin
    .from('system_settings')
    .select('key, value')
    .eq('is_public', true);
  if (error) throw new SystemSettingsError('Could not load public settings.', 500, { reason: error.message });
  return rowsToMap(data, { publicOnly: true });
};

// Per-key sanitizers so the admin form cannot store arbitrary/invalid shapes.
const sanitizeValue = (key, value) => {
  const v = value && typeof value === 'object' ? value : {};
  switch (key) {
    case 'announcement':
      return {
        enabled: Boolean(v.enabled),
        message: String(v.message ?? '').slice(0, 500),
        type: ['info', 'warning', 'success'].includes(v.type) ? v.type : 'info',
      };
    case 'maintenance':
      return { enabled: Boolean(v.enabled), message: String(v.message ?? '').slice(0, 500) };
    case 'site_access':
      return normalizeSiteAccess(v);
    case 'creator_registration':
      return { open: Boolean(v.open) };
    case 'upload_limit_mb': {
      const n = Number(v.value);
      const clamped = Number.isFinite(n) ? Math.min(HARD_UPLOAD_LIMIT_MB, Math.max(1, Math.round(n))) : HARD_UPLOAD_LIMIT_MB;
      return { value: clamped };
    }
    default:
      return null;
  }
};

export const updateSettings = async (patch = {}, updatedBy = null) => {
  const entries = Object.entries(patch ?? {}).filter(([key]) => KNOWN_KEYS.includes(key));
  if (!entries.length) return getAllSettings();

  const stampedAt = new Date().toISOString();
  const rows = entries.map(([key, value]) => ({
    key,
    value: sanitizeValue(key, value),
    is_public: SETTINGS[key].isPublic,
    updated_at: stampedAt,
    updated_by: updatedBy,
  }));

  const { error } = await supabaseAdmin
    .from('system_settings')
    .upsert(rows, { onConflict: 'key' });
  if (error) throw new SystemSettingsError('Could not save settings.', 500, { reason: error.message });

  invalidateSettingsCache();
  return getAllSettings();
};

// --- Cached helpers for other services (avoid a DB read on every request) ---
let cache = { value: null, at: 0 };
const CACHE_TTL_MS = 30_000;

const getCachedSettings = async () => {
  const now = Date.now();
  if (cache.value && now - cache.at < CACHE_TTL_MS) return cache.value;
  const value = await getAllSettings();
  cache = { value, at: now };
  return value;
};

export const invalidateSettingsCache = () => {
  cache = { value: null, at: 0 };
};

// Effective source-document upload limit in bytes. The configured value can only LOWER
// the hard ceiling, never exceed it, so a misconfiguration cannot allow oversized uploads.
export const getUploadLimitBytes = async (fallbackBytes) => {
  try {
    const settings = await getCachedSettings();
    const mb = Number(settings?.upload_limit_mb?.value);
    if (Number.isFinite(mb) && mb > 0) return Math.min(fallbackBytes, mb * 1024 * 1024);
  } catch {
    // Best-effort: fall back to the hard ceiling if the setting cannot be read.
  }
  return fallbackBytes;
};

export const isCreatorRegistrationOpen = async () => {
  try {
    const settings = await getCachedSettings();
    return settings?.creator_registration?.open !== false;
  } catch {
    return true; // Best-effort: default to open.
  }
};

export const getSiteAccessState = async () => {
  if (process.env.NODE_ENV === 'test') {
    return { mode: SITE_ACCESS_MODES.OPEN, message: '' };
  }

  try {
    const settings = await getCachedSettings();
    return normalizeSiteAccess(settings?.site_access);
  } catch {
    return {
      mode: SITE_ACCESS_MODES.CLOSED,
      message: 'No se pudo verificar la disponibilidad de la plataforma.',
    };
  }
};
