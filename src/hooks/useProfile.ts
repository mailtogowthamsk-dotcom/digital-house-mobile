import { useState, useEffect, useCallback } from "react";
import { getProfile } from "../api/profile.api";
import type { ProfileMeResponse } from "../api/profile.api";
import { getErrorStatus } from "../api/client";

export type ProfileError = { message: string; status?: number };

export function useProfile() {
  const [profile, setProfile] = useState<ProfileMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ProfileError | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (e) {
      const status = getErrorStatus(e);
      const message = (e as any)?.response?.data?.message ?? "Failed to load profile";
      setError({ message, status });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile
  };
}
