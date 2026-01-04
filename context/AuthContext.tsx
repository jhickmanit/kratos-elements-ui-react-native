import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Session } from "@ory/client-fetch";
import { createOryClient, ory, oryUrl } from "../api/ory";
import { getSessionToken, setSessionToken, clearSessionToken } from "../api/session";
import { isWeb } from "../api/platform";

interface AuthContextType {
  session: Session | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkSession: () => Promise<void>;
  setAuth: (session: Session, token?: string) => Promise<void>;
  logout: () => Promise<void>;
  getAuthenticatedClient: () => ReturnType<typeof createOryClient>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionToken, setSessionTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = session !== null;

  const getAuthenticatedClient = useCallback(() => {
    return createOryClient(sessionToken);
  }, [sessionToken]);

  const checkSession = useCallback(async () => {
    setIsLoading(true);
    try {
      let token: string | null = null;

      // For native, load the stored session token
      if (!isWeb) {
        token = await getSessionToken();
        if (token) {
          setSessionTokenState(token);
        }
      }

      // Create client with token (native) or cookies (web)
      const client = createOryClient(token);
      const sessionResponse = await client.toSession();

      setSession(sessionResponse);
    } catch (error: any) {
      // 401 means no valid session
      if (error?.response?.status === 401) {
        setSession(null);
        setSessionTokenState(null);
        // Clear stored token on native if session is invalid
        if (!isWeb) {
          await clearSessionToken();
        }
      } else {
        console.error("Session check failed:", error);
        setSession(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setAuth = useCallback(async (newSession: Session, token?: string) => {
    setSession(newSession);

    // For native, store the session token
    if (!isWeb && token) {
      await setSessionToken(token);
      setSessionTokenState(token);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const client = getAuthenticatedClient();

      if (isWeb) {
        // For web, create a browser logout flow and redirect
        const { logout_url } = await client.createBrowserLogoutFlow();
        if (logout_url) {
          // In web, we need to redirect to the logout URL
          window.location.href = logout_url;
          return;
        }
      } else {
        // For native, perform logout via API
        if (sessionToken) {
          await client.performNativeLogout({
            performNativeLogoutBody: {
              session_token: sessionToken,
            },
          });
        }
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Clear local state
      setSession(null);
      setSessionTokenState(null);
      if (!isWeb) {
        await clearSessionToken();
      }
    }
  }, [sessionToken, getAuthenticatedClient]);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const value = useMemo(
    () => ({
      session,
      sessionToken,
      isLoading,
      isAuthenticated,
      checkSession,
      setAuth,
      logout,
      getAuthenticatedClient,
    }),
    [
      session,
      sessionToken,
      isLoading,
      isAuthenticated,
      checkSession,
      setAuth,
      logout,
      getAuthenticatedClient,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
