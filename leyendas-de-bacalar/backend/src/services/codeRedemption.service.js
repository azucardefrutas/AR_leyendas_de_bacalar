import { supabaseAdmin } from '../config/supabaseAdmin.js';


const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000; // 15 minutos
const attempts = new Map(); // userId -> { fails, blockedUntil }

// Normalizacion server-side: mayusculas, sin espacios. (La DB tambien normaliza y hashea.)
function normalizeCode(code) {
  return String(code || '').toUpperCase().replace(/\s+/g, '').trim();
}

function blockedSeconds(userId) {
  const entry = attempts.get(userId);
  if (entry?.blockedUntil && entry.blockedUntil > Date.now()) {
    return Math.ceil((entry.blockedUntil - Date.now()) / 1000);
  }
  return 0;
}

function registerFail(userId) {
  const entry = attempts.get(userId) || { fails: 0, blockedUntil: 0 };
  entry.fails += 1;
  if (entry.fails >= MAX_ATTEMPTS) {
    entry.blockedUntil = Date.now() + BLOCK_MS;
    entry.fails = 0;
  }
  attempts.set(userId, entry);
}

function resetFails(userId) {
  attempts.delete(userId);
}

export async function redeemCodeForUser(userId, rawCode) {
  const waitSeconds = blockedSeconds(userId);
  if (waitSeconds > 0) {
    const minutes = Math.ceil(waitSeconds / 60);
    const error = new Error(`Demasiados intentos fallidos. Intenta de nuevo en ${minutes} minuto(s).`);
    error.status = 429;
    throw error;
  }

  const code = normalizeCode(rawCode);
  if (!code) {
    const error = new Error('Debes ingresar un codigo.');
    error.status = 400;
    throw error;
  }

  const { data, error } = await supabaseAdmin.rpc('redeem_access_code_as', {
    p_user_id: userId,
    p_code: code,
  });

  if (error) {
    registerFail(userId);
    const err = new Error(error.message || 'No se pudo canjear el codigo.');
    err.status = 400;
    throw err;
  }

  resetFails(userId);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    legendId: row?.legend_id || null,
    message: row?.message || 'Codigo canjeado correctamente. La leyenda fue desbloqueada.',
  };
}
