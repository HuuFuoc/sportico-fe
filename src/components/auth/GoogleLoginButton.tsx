"use client";

// ============================================================================
// Google sign-in entry point for /login and /register.
//
// Flow A (default) — Google Identity Services renders its OWN button and hands
// back an ID token. We never fake a Google-looking button while GIS is
// available: the real one is the only thing that can produce a credential.
//
// Flow B (fallback) — a plain ghost button that starts the redirect OAuth
// handshake. It is shown only when Flow A genuinely cannot run:
//   • NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set (GIS cannot initialise at all)
//   • the gsi/client script failed to load (offline, blocked, ad blocker)
// A script failure must never take the page down — the email/password form
// keeps working either way.
//
// Loading discipline: `pending` is owned by useGoogleLogin and only becomes
// true once Google has actually delivered a credential. Closing the Google
// popup produces no callback, so it cannot strand a spinner.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2, TriangleAlert } from "lucide-react";
import { AuthButton } from "@/components/ui/AuthButton";
import { Divider } from "@/components/ui/Divider";
import { startGoogleRedirectLogin } from "@/lib/auth-api";
import { rememberReturnTo, redirectParamFromLocation } from "@/lib/auth-post-login";
import { useGoogleLogin } from "@/lib/hooks/useGoogleLogin";
import { isMockMode } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const GSI_SRC = "https://accounts.google.com/gsi/client";

/** GIS clamps the rendered button width into this range. */
const MIN_BUTTON_WIDTH = 200;
const MAX_BUTTON_WIDTH = 400;

type ScriptState = "loading" | "ready" | "failed";

export function GoogleLoginButton({
  /** GIS button copy. "signup_with" reads better on /register. */
  text = "continue_with",
  /** Disable while the email/password form owns the auth state. */
  disabled = false,
  /** Lets the host form disable its own submit while Google is working. */
  onBusyChange,
}: {
  text?: GoogleButtonConfiguration["text"];
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const clientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim();
  const { loginWithIdToken, pending, error, unavailable } = useGoogleLogin();

  const [scriptState, setScriptState] = useState<ScriptState>(
    clientId ? "loading" : "failed",
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const renderCheckRef = useRef<number | null>(null);

  // The GIS callback is registered once and lives for the page's lifetime, so
  // it must read the LATEST handler rather than close over the first one.
  const handlerRef = useRef(loginWithIdToken);
  useEffect(() => {
    handlerRef.current = loginWithIdToken;
  }, [loginWithIdToken]);

  useEffect(() => {
    onBusyChange?.(pending);
  }, [pending, onBusyChange]);

  const renderGoogleButton = useCallback(() => {
    const container = containerRef.current;
    const gis = typeof window !== "undefined" ? window.google?.accounts.id : null;
    if (!container || !gis || !clientId) return;

    try {
      gis.initialize({
        client_id: clientId,
        callback: (response) => {
          // Never log `response.credential` — it is a live Google ID token.
          void handlerRef.current(response?.credential);
        },
        // One Tap is not used here; only the explicit button.
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
      });

      container.innerHTML = "";
      const width = Math.min(
        MAX_BUTTON_WIDTH,
        Math.max(MIN_BUTTON_WIDTH, Math.round(container.clientWidth || 320)),
      );
      gis.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        logo_alignment: "left",
        text,
        width,
        locale: "vi",
      });

      // GIS reports an unauthorized JavaScript origin only through a console
      // log — it renders NOTHING and throws nothing. Left alone that is a dead
      // 44px hole where a sign-in button should be, so treat "no child node
      // appeared" as a failure and hand the user the redirect flow instead.
      if (container.childElementCount > 0) {
        setScriptState("ready");
        return;
      }
      if (renderCheckRef.current !== null) {
        window.clearTimeout(renderCheckRef.current);
      }
      renderCheckRef.current = window.setTimeout(() => {
        renderCheckRef.current = null;
        const node = containerRef.current;
        setScriptState(node && node.childElementCount > 0 ? "ready" : "failed");
      }, 1500);
    } catch {
      // A malformed client id or a blocked iframe lands here. Fall back to the
      // redirect flow instead of showing a dead control.
      setScriptState("failed");
    }
  }, [clientId, text]);

  // Handles the client-side-navigation case: /login → /register reuses the
  // already-loaded script, so `onReady` may be the only signal we get, and on
  // some paths none at all. Re-check on mount.
  useEffect(() => {
    if (!clientId) return;
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      renderGoogleButton();
    }

    // Last-resort deadline. If neither `onReady` nor `onError` ever fires
    // (script blocked by an extension, a next/script edge case on client
    // navigation), the skeleton would otherwise pulse forever and the user
    // would have no way to sign in with Google at all. Fall through to the
    // redirect flow instead of leaving a permanent placeholder.
    const deadline = window.setTimeout(() => {
      setScriptState((current) => (current === "loading" ? "failed" : current));
    }, 5000);

    return () => {
      window.clearTimeout(deadline);
      if (renderCheckRef.current !== null) {
        window.clearTimeout(renderCheckRef.current);
        renderCheckRef.current = null;
      }
      try {
        window.google?.accounts.id.cancel();
      } catch {
        // GIS not loaded — nothing to cancel.
      }
    };
  }, [clientId, renderGoogleButton]);

  // Mock mode has no backend to exchange a Google token against. Show the
  // control DISABLED with a reason rather than rendering nothing: silently
  // omitting it is indistinguishable from the feature being broken, and
  // `NEXT_PUBLIC_API_BASE_URL= pnpm dev` is a normal local workflow here.
  if (isMockMode()) {
    return (
      <div className="space-y-2.5">
        <Divider>Hoặc tiếp tục với</Divider>
        <AuthButton type="button" variant="ghost" disabled leading={<GoogleMark />}>
          Tiếp tục với Google
        </AuthButton>
        <p className="text-center text-[12px] text-slate-400">
          Đăng nhập Google cần kết nối đến backend thật.
        </p>
      </div>
    );
  }

  // 503 AUTH_GOOGLE_CONFIGURATION_MISSING: withdraw the option for this
  // session rather than invite a retry that cannot succeed. No env var names
  // are shown to the user.
  if (unavailable) {
    return (
      <p
        role="alert"
        className="mt-5 rounded-[12px] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-800"
      >
        <TriangleAlert size={13} className="mr-1.5 inline-block align-[-2px]" />
        {error ??
          "Đăng nhập Google hiện chưa khả dụng. Vui lòng dùng email và mật khẩu."}
      </p>
    );
  }

  const busy = pending || disabled;

  return (
    <div className="space-y-2.5">
      <Divider>Hoặc tiếp tục với</Divider>
      {clientId && (
        <Script
          src={GSI_SRC}
          strategy="afterInteractive"
          onReady={renderGoogleButton}
          onError={() => setScriptState("failed")}
        />
      )}

      {/* Fixed 44px height in every state — the GIS iframe swapping in must
          not push the form around. */}
      <div className={cn("relative min-h-[44px]", busy && "opacity-60")}>
        {/* GIS renders into this node. It stays in the layout flow even before
            the iframe exists (`invisible`, never `hidden`) so the width we
            hand renderButton is the real one. */}
        <div
          ref={containerRef}
          className={cn(
            "flex min-h-[44px] w-full items-center justify-center",
            scriptState !== "ready" && "invisible",
          )}
        />

        {scriptState === "loading" && (
          <div
            aria-hidden
            className="absolute inset-0 animate-pulse rounded-[12px] border border-slate-200 bg-slate-100/70"
          />
        )}

        {scriptState === "failed" && (
          <div className="absolute inset-0">
            <AuthButton
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                // Survive the full-page round trip: the ?redirect= the 401
                // interceptor put on /login is gone once we leave the SPA.
                rememberReturnTo(redirectParamFromLocation());
                startGoogleRedirectLogin();
              }}
              leading={<GoogleMark />}
            >
              Tiếp tục với Google
            </AuthButton>
          </div>
        )}

        {/* Blocks clicks on the GIS iframe while a request is in flight or the
            email form owns the auth state. */}
        {busy && (
          <div
            aria-hidden
            className="absolute inset-0 cursor-not-allowed rounded-[12px]"
          />
        )}
      </div>

      {pending && (
        <p
          role="status"
          className="flex items-center justify-center gap-1.5 text-[12.5px] text-slate-500"
        >
          <Loader2 size={12} className="animate-spin" />
          Đang xác thực với Google…
        </p>
      )}

      {error && !pending && (
        <p
          role="alert"
          className="text-[12.5px] leading-relaxed text-rose-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/** Google "G" mark for the redirect-fallback button (GIS draws its own). */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.94v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.94a9 9 0 0 0 0 8.1l3.03-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .94 4.95l3.03 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
