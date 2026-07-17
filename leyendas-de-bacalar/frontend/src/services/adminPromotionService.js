import { requestBackend } from './backendApiService.js';

// Promociones del admin: regalar acceso a una leyenda sin compra ni codigo. Todo pasa
// por el backend (service-role + rol admin); el acceso se guarda como una fila
// user_legend_access con source 'admin_grant', que user_has_active_legend_access ya
// respeta -> el lector la abre de inmediato.

export async function getLegendGrants() {
  try {
    const response = await requestBackend('/api/v1/admin/legend-grants', {
      operation: 'admin-legend-grants',
    });
    return { data: response?.grants ?? [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}

export async function grantLegendAccess({ userId, legendId, expiresAt = null }) {
  try {
    const response = await requestBackend('/api/v1/admin/legend-grants', {
      method: 'POST',
      operation: 'admin-grant-legend-access',
      body: { userId, legendId, expiresAt },
    });
    return { data: response, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function revokeLegendGrant(accessId) {
  try {
    const response = await requestBackend(`/api/v1/admin/legend-grants/${encodeURIComponent(accessId)}`, {
      method: 'DELETE',
      operation: 'admin-revoke-legend-grant',
    });
    return { data: response, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Leyendas para el selector (mismo endpoint enriquecido del panel admin).
export async function getAdminLegendsForGrant() {
  try {
    const response = await requestBackend('/api/v1/admin/legends', { operation: 'admin-legends' });
    return { data: response?.legends ?? [], error: null };
  } catch (error) {
    return { data: [], error };
  }
}
