import { useCallback, useEffect, useState } from 'react';
import { getCurrentProfile, updateCurrentProfile } from '../services/profileService.js';
import { useAuth } from './useAuth.js';

export function useProfile() {
  const { isAuthenticated, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(isAuthenticated));
  const [error, setError] = useState(null);

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null);
      setLoading(false);
      return { data: null, error: null };
    }

    setLoading(true);
    const { data, error: profileError } = await getCurrentProfile();
    setProfile(data);
    setError(profileError);
    setLoading(false);

    return { data, error: profileError };
  }, [isAuthenticated]);

  async function updateProfile(payload) {
    const { data, error: updateError } = await updateCurrentProfile(payload);
    if (!updateError) setProfile(data);
    setError(updateError);

    return { data, error: updateError };
  }

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile, user?.id]);

  return {
    profile,
    loading,
    error,
    refreshProfile,
    updateProfile,
  };
}
