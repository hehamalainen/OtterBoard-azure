import { AuthUser } from "../types";

const authProvider = import.meta.env.VITE_AUTH_PROVIDER || "aad";

export const login = () => {
  window.location.assign(`/.auth/login/${authProvider}`);
};

export const logout = () => {
  window.location.assign("/.auth/logout");
};

export const fetchUser = async (): Promise<AuthUser | null> => {
  const response = await fetch("/.auth/me");

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to load authentication profile.");
  }

  const payload = await response.json();
  const principal = payload?.clientPrincipal;
  if (!principal) return null;

  return {
    id: principal.userId,
    email: principal.userDetails || "",
    name: principal.userDetails || principal.userId,
    identityProvider: principal.identityProvider || "",
    roles: principal.userRoles || []
  };
};
