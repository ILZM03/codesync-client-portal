import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    let alive = true;
    api.getSession().then((s) => alive && setSession(s ?? null));
    const off = api.onAuthChange((s) => setSession(s ?? null));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const userId = session?.user?.id;
  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      setProfileError(null);
      setProfile(await api.getProfile(userId));
    } catch (e) {
      setProfileError(e.message);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const value = {
    session,
    profile,
    profileError,
    loading: session === undefined || (!!session && !profile && !profileError),
    isStaff: profile?.role === 'staff',
    refreshProfile: loadProfile,
    signOut: () => api.signOut(),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
