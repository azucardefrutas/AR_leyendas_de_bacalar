import { supabaseAdmin } from '../config/supabaseAdmin.js';

const unauthorized = (res) =>
  res.status(401).json({
    ok: false,
    error: 'Unauthorized.',
  });

export const requireAuth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return unauthorized(res);
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token || authorization.split(' ').length !== 2) {
      return unauthorized(res);
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return unauthorized(res);
    }

    const { user } = data;

    req.user = {
      id: user.id,
      email: user.email,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
    };

    return next();
  } catch {
    return unauthorized(res);
  }
};
