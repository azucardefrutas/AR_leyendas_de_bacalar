import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth.js';

export function useRequireAuth() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      navigate('/login', { replace: true, state: { from: location } });
    }
  }, [auth.isAuthenticated, auth.loading, location, navigate]);

  return auth;
}
