import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { api } from './lib/api';

type AuthConfig = {
  enabled: boolean;
  mode: string;
  login_path: string;
  logout_path: string;
  local_dev_bypass: boolean;
};

type AuthUser = {
  sub: string;
  email?: string | null;
  name?: string | null;
  roles: string[];
  auth_source: string;
};

type AuthSession = {
  authenticated: boolean;
  user: AuthUser | null;
};

type AuthContextValue = {
  loading: boolean;
  config: AuthConfig | null;
  user: AuthUser | null;
  authenticated: boolean;
  refresh: () => Promise<void>;
  beginLogin: (nextPath?: string) => void;
  beginDevBypass: (nextPath?: string) => void;
  beginLogout: (nextPath?: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function currentPathWithQuery(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const nextConfig = await api<AuthConfig>('/api/auth/config');
      setConfig(nextConfig);
      if (!nextConfig.enabled) {
        setUser(null);
        return;
      }
      try {
        const session = await api<AuthSession>('/api/auth/me');
        setUser(session.authenticated ? session.user : null);
      } catch {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const onUnauthorized = () => setUser(null);
    window.addEventListener('bridge:unauthorized', onUnauthorized as EventListener);
    return () => window.removeEventListener('bridge:unauthorized', onUnauthorized as EventListener);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    config,
    user,
    authenticated: Boolean(user) || Boolean(config && !config.enabled),
    refresh,
    beginLogin: (nextPath?: string) => {
      const next = encodeURIComponent(nextPath || currentPathWithQuery());
      window.location.assign(`${config?.login_path || '/api/auth/login'}?next=${next}`);
    },
    beginDevBypass: (nextPath?: string) => {
      const next = encodeURIComponent(nextPath || currentPathWithQuery());
      window.location.assign(`/api/auth/dev-bypass?next=${next}`);
    },
    beginLogout: (nextPath?: string) => {
      const next = encodeURIComponent(nextPath || '/login');
      window.location.assign(`${config?.logout_path || '/api/auth/logout'}?next=${next}`);
    },
  }), [loading, config, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
