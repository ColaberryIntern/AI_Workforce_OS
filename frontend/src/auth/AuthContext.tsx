import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { auth, type AuthUser } from '../api/auth';
import { getToken, setToken } from '../api/client';

const REFRESH_KEY = 'aiwos.refreshToken';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (key: string) => boolean;
  hasRole: (name: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getRefresh(): string | null {
  try {
    return window.localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function setRefresh(t: string | null): void {
  try {
    if (t) window.localStorage.setItem(REFRESH_KEY, t);
    else window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: if a token is in localStorage, try to load /me
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    auth
      .me()
      .then((res) => setUser(res.user))
      .catch(() => {
        setToken(null);
        setRefresh(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const result = await auth.login({ email, password });
    setToken(result.tokens.accessToken);
    setRefresh(result.tokens.refreshToken);
    setUser(result.user);
  }

  async function register(email: string, password: string, displayName: string) {
    const result = await auth.register({ email, password, displayName });
    setToken(result.tokens.accessToken);
    setRefresh(result.tokens.refreshToken);
    setUser(result.user);
  }

  async function logout() {
    const r = getRefresh();
    if (r) {
      try {
        await auth.logout(r);
      } catch {
        // proceed regardless
      }
    }
    setToken(null);
    setRefresh(null);
    setUser(null);
  }

  function hasPermission(key: string) {
    return !!user?.permissions?.includes(key);
  }

  function hasRole(name: string) {
    return !!user?.roles?.includes(name);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
