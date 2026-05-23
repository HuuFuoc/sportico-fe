"use client";

import { useState } from "react";
import { AuthButton } from "@/components/ui/AuthButton";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.92h5.45c-.24 1.4-1.66 4.1-5.45 4.1-3.28 0-5.96-2.72-5.96-6.07S8.72 6.08 12 6.08c1.86 0 3.12.79 3.84 1.47l2.62-2.52C16.86 3.51 14.66 2.5 12 2.5 6.74 2.5 2.5 6.74 2.5 12s4.24 9.5 9.5 9.5c5.49 0 9.13-3.86 9.13-9.3 0-.62-.07-1.1-.16-1.5H12Z"
      />
      <path
        fill="#34A853"
        d="M12 21.5c2.66 0 4.88-.88 6.5-2.4l-3.18-2.46c-.85.58-1.99.99-3.32.99-2.55 0-4.71-1.72-5.49-4.04l-3.27 2.52C4.92 19.34 8.21 21.5 12 21.5Z"
      />
      <path
        fill="#FBBC05"
        d="M6.51 13.59c-.2-.58-.31-1.21-.31-1.59 0-.55.1-1.07.27-1.55L3.21 7.93C2.6 9.13 2.25 10.52 2.25 12c0 1.48.35 2.87.96 4.07l3.3-2.48Z"
      />
      <path
        fill="#4285F4"
        d="M21.13 12.2c0-.62-.07-1.1-.16-1.5H12v3.92h5.45c-.24 1.4-1.66 4.1-5.45 4.1l-.04.04 3.18 2.46c2.86-2.55 3.99-6.31 3.99-9.02Z"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.07 0-1.12.39-2.03 1.03-2.74-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05a9.34 9.34 0 0 1 5.01 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.71 1.03 1.62 1.03 2.74 0 3.94-2.34 4.8-4.57 5.06.36.31.68.93.68 1.88 0 1.36-.01 2.46-.01 2.79 0 .27.18.59.69.49C19.13 20.62 22 16.77 22 12.25 22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

export function SocialButtons({ disabled }: { disabled?: boolean }) {
  const [busy, setBusy] = useState<"google" | "github" | null>(null);

  const handle = (id: "google" | "github") => {
    if (busy || disabled) return;
    setBusy(id);
    // Simulate redirect / oauth round-trip
    setTimeout(() => setBusy(null), 1500);
  };

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <AuthButton
        variant="ghost"
        type="button"
        loading={busy === "google"}
        disabled={disabled || busy !== null}
        onClick={() => handle("google")}
        leading={<GoogleIcon />}
        aria-label="Continue with Google"
      >
        Google
      </AuthButton>
      <AuthButton
        variant="ghost"
        type="button"
        loading={busy === "github"}
        disabled={disabled || busy !== null}
        onClick={() => handle("github")}
        leading={<GithubIcon />}
        aria-label="Continue with GitHub"
      >
        GitHub
      </AuthButton>
    </div>
  );
}
