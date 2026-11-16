import { createContext, useCallback, useContext, useMemo } from "react";
import { authClient, hasAdminRole } from "./authClient";

const AuthContext = createContext(null);

/**
 * The session lives in an httpOnly cookie that only the server can read,
 * so the signed-in user comes from Better Auth's session endpoint.
 */
export function AuthProvider({ children }) {
  const { data, isPending, refetch } = authClient.useSession();
  const sessionUser = data?.user ?? null;

  const logout = useCallback(async () => {
    await authClient.signOut();
    await refetch();
  }, [refetch]);

  const value = useMemo(
    () => ({
      user: sessionUser ? { name: sessionUser.name, email: sessionUser.email, image: sessionUser.image } : null,
      isAuthenticated: Boolean(sessionUser),
      isAdmin: hasAdminRole(sessionUser),
      isPending,
      refresh: refetch,
      logout,
    }),
    [sessionUser, isPending, refetch, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
