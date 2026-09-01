import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Api, getToken, setToken, ApiError } from "./api";
import { clearWalletCache } from "./persist";

/**
 * Session context — restores the SecureStore session on launch, validates it
 * against /api/account/me, and exposes the email+code login used across the
 * whole platform (same accounts as web).
 */
interface AuthState {
  email: string | null;
  loading: boolean;
  requestCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  email: null,
  loading: true,
  requestCode: async () => {},
  verifyCode: async () => false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const me = await Api.me();
          setEmail(me.email);
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) await setToken(null); // expired session
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const requestCode = useCallback(async (addr: string) => {
    await Api.requestCode(addr.trim().toLowerCase());
  }, []);

  const verifyCode = useCallback(async (addr: string, code: string) => {
    try {
      const res = await Api.verifyCode(addr.trim().toLowerCase(), code.trim());
      await setToken(res.token);
      setEmail(res.email);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await setToken(null);
    setEmail(null);
    // Drop the offline wallet so a handed-off device can't show prior tickets.
    qc.removeQueries();
    await clearWalletCache();
  }, [qc]);

  return (
    <AuthContext.Provider value={{ email, loading, requestCode, verifyCode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
