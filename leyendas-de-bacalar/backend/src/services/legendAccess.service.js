import { supabaseAdmin } from '../config/supabaseAdmin.js';

class LegendAccessError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'LegendAccessError';
    this.statusCode = statusCode;
  }
}

const hasRole = (roles, role) => Array.isArray(roles) && roles.includes(role);

export const getLegendAccessContext = async ({ legendId, userId, roles }) => {
  if (!legendId) {
    throw new LegendAccessError('Legend id is required.', 400);
  }

  if (!userId) {
    throw new LegendAccessError('Unauthorized.', 401);
  }

  const { data: legend, error } = await supabaseAdmin
    .from('legends')
    .select('id, title, status, creator_id')
    .eq('id', legendId)
    .maybeSingle();

  if (error) {
    throw new LegendAccessError('Could not load legend.', 500);
  }

  if (!legend) {
    throw new LegendAccessError('Legend not found.', 404);
  }

  if (hasRole(roles, 'admin')) {
    return { legend };
  }

  if (hasRole(roles, 'creator') && String(legend.creator_id) === String(userId)) {
    return { legend };
  }

  throw new LegendAccessError('Forbidden.', 403);
};
