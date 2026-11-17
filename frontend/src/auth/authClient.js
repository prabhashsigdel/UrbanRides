import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { API_URL } from "../lib/api";

export const authClient = createAuthClient({
  baseURL: API_URL || window.location.origin,
  // authClient.admin.*: list users, set roles, ban. The server checks the admin role on each call.
  plugins: [adminClient()],
});

/** Better Auth stores roles as a comma-separated string, e.g. "user" or "admin". */
export function hasAdminRole(user) {
  return String(user?.role ?? "").split(",").map((r) => r.trim()).includes("admin");
}

const AUTH_ERRORS = {
  INVALID_EMAIL_OR_PASSWORD: "Email or password is incorrect.",
  USER_ALREADY_EXISTS: "An account with this email already exists. Log in instead.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account with this email already exists. Log in instead.",
  PASSWORD_TOO_SHORT: "Use at least 8 characters.",
  PROVIDER_NOT_FOUND: "Google sign-in isn’t set up yet.",
};

// Codes Better Auth puts in ?error= when Google sign-in bounces back to the login page.
const REDIRECT_ERRORS = {
  account_not_linked:
    "This email already has a password account. Log in with your password; Google sign-in for it will work once the email is verified.",
  access_denied: "Google sign-in was cancelled.",
};

/** Message for the ?error= code on the login page after a failed Google sign-in, or null. */
export function redirectErrorMessage(code) {
  if (!code) return null;
  return REDIRECT_ERRORS[code] || "Google sign-in didn’t work. Please try again.";
}

/** Friendly message for a Better Auth client error ({ code, message, status }). */
export function authErrorMessage(error, fallback) {
  if (!error) return fallback;
  if (error.status === 429) return "Too many attempts. Wait a minute and try again.";
  return AUTH_ERRORS[error.code] || error.message || fallback;
}
