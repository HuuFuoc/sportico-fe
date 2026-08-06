"use client";

// ============================================================================
// The single Google sign-in state machine, shared by BOTH flows:
//
//   Flow A — Google Identity Services ID token  (GoogleLoginButton)
//   Flow B — redirect OAuth one-time code        (/auth/google/callback)
//
// It is deliberately not a second auth system. It reuses the existing token
// store (`auth-token.ts`), the existing auth store (`useAuthStore`), the
// existing API client (`apiFetch` via `auth-api.ts`) and the existing refresh
// interceptor. Once it finishes, a Google session is indistinguishable from a
// password session — including refresh-token rotation, which needs the email
// that only GET /api/auth/me can confirm.
//
// Ordering matters, and the rollback is the point:
//
//   1. POST the Google credential  → Sportico { accessToken, refreshToken }.
//   2. Persist provisionally (email guessed from the JWT) so step 3 can send
//      the Bearer header. NOT yet "authenticated".
//   3. GET /api/auth/me — the only thing that makes the session real.
//   4. Re-persist with the AUTHORITATIVE email from /me, publish the user.
//   5. If step 3 fails: wipe tokens + auth store. Never leave the UI in a
//      half-signed-in state holding a token nobody validated.
// ============================================================================

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AuthError,
  getCurrentUser,
  googleExchangeCode,
  googleIdTokenLogin,
  type LoginResponse,
} from "@/lib/auth-api";
import { decodeJwt } from "@/lib/auth-session";
import { clearAuthTokens, setAuthTokens } from "@/lib/auth-token";
import {
  getAuthErrorMessage,
  isGoogleUnavailable,
} from "@/lib/auth-error-messages";
import {
  postLoginHref,
  redirectParamFromLocation,
  safeInternalPath,
} from "@/lib/auth-post-login";
import { useAppStore } from "@/lib/store/useAppStore";
import { primaryRole, useAuthStore } from "@/lib/store/useAuthStore";
import type { CurrentUserResponse } from "@/lib/types/coach";

export interface UseGoogleLoginResult {
  /** Flow A entry point. Safe to call from the raw GIS callback. */
  loginWithIdToken: (idToken: string | undefined) => Promise<void>;
  /** Flow B entry point. The code is single-use — call exactly once. */
  loginWithExchangeCode: (
    code: string,
    options?: { returnTo?: string | null },
  ) => Promise<void>;
  /** A request is in flight (set only once Google has actually handed us a
   *  credential, so closing the popup can never strand a spinner). */
  pending: boolean;
  /** User-facing Vietnamese failure, or null. */
  error: string | null;
  /** Backend has no Google credentials configured (503) — hide the option. */
  unavailable: boolean;
  clearError: () => void;
}

export function useGoogleLogin(): UseGoogleLoginResult {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  // Guards a double click, a double GIS callback, and React Strict Mode's
  // double effect invocation. A ref, not state: it has to be readable and
  // writable synchronously, before React has a chance to re-render.
  const inFlightRef = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Turn a Sportico token set into a live session, then navigate.
   * Throws nothing — every failure is surfaced through `error`.
   */
  const finishSession = useCallback(
    async (tokens: LoginResponse, returnTo?: string | null) => {
      // Provisional email from the access-token claims. It is only a
      // placeholder so the /me request below carries a Bearer header; the
      // value written for keeps comes from /me itself.
      const claims = decodeJwt(tokens.accessToken);
      const claimEmail =
        claims &&
        typeof claims["email"] === "string" &&
        (claims["email"] as string).length > 0
          ? (claims["email"] as string)
          : "";

      setAuthTokens({ ...tokens, email: claimEmail });

      let me: CurrentUserResponse;
      try {
        me = await getCurrentUser();
      } catch (err) {
        // Rollback: the token was never validated, so it must not survive.
        clearAuthTokens();
        useAuthStore.getState().clear();
        throw err;
      }

      // Authoritative email — required by POST /api/auth/refresh-token.
      setAuthTokens({ ...tokens, email: me.email ?? claimEmail });

      useAuthStore.getState().setUser(me);
      const role = primaryRole(me) ?? "learner";
      useAppStore.getState().setRole(role);
      if (me.id) useAppStore.getState().setCurrentUserId(me.id);

      // The cache may hold anonymous or previous-user responses. Drop it all
      // rather than guess which keys are user-scoped.
      queryClient.clear();

      const dest =
        safeInternalPath(returnTo) ??
        redirectParamFromLocation() ??
        postLoginHref(role);
      router.replace(dest);
    },
    [queryClient, router],
  );

  /** Shared failure handling for both flows. Never rethrows. */
  const handleFailure = useCallback((err: unknown) => {
    if (err instanceof AuthError) {
      if (isGoogleUnavailable(err.errorCode, err.status)) {
        setUnavailable(true);
      }
      // AuthError already carries mapped Vietnamese copy; fall back to the
      // code map when it somehow does not.
      setError(err.message || getAuthErrorMessage(err.errorCode, err.status));
      return;
    }
    setError(getAuthErrorMessage(null));
  }, []);

  const loginWithIdToken = useCallback(
    async (idToken: string | undefined) => {
      // Google can invoke the callback with no credential (dismissed prompt,
      // FedCM abort). Nothing to send — and nothing to show.
      if (!idToken) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setError(null);
      setPending(true);
      try {
        const tokens = await googleIdTokenLogin(idToken);
        await finishSession(tokens);
      } catch (err) {
        handleFailure(err);
      } finally {
        inFlightRef.current = false;
        setPending(false);
      }
    },
    [finishSession, handleFailure],
  );

  const loginWithExchangeCode = useCallback(
    async (code: string, options?: { returnTo?: string | null }) => {
      if (!code) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setError(null);
      setPending(true);
      try {
        const tokens = await googleExchangeCode(code);
        await finishSession(tokens, options?.returnTo);
      } catch (err) {
        handleFailure(err);
      } finally {
        inFlightRef.current = false;
        setPending(false);
      }
    },
    [finishSession, handleFailure],
  );

  return {
    loginWithIdToken,
    loginWithExchangeCode,
    pending,
    error,
    unavailable,
    clearError,
  };
}
