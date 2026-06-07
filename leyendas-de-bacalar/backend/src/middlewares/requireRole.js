import { getUserRoleNames } from '../services/role.service.js';

const unauthorized = (res) =>
  res.status(401).json({
    ok: false,
    error: 'Unauthorized.',
  });

const forbidden = (res) =>
  res.status(403).json({
    ok: false,
    error: 'Forbidden.',
  });

export const requireRole = (allowedRoles) => async (req, res, next) => {
  if (!req.user?.id) {
    return unauthorized(res);
  }

  try {
    const roles = await getUserRoleNames(req.user.id);
    const allowedRoleSet = new Set(allowedRoles);

    req.user.roles = roles;

    if (!roles.some((role) => allowedRoleSet.has(role))) {
      return forbidden(res);
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
