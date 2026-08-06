// ============================================================================
// Minimal ambient typings for Google Identity Services (GIS).
//
// Script: https://accounts.google.com/gsi/client — loaded via `next/script` in
// `src/components/auth/GoogleLoginButton.tsx`. Only the surface we actually use
// is declared; `@types/google.accounts` is deliberately NOT added as a
// dependency for four call signatures.
// ============================================================================

export {};

declare global {
  /** Payload handed to the `callback` passed to `google.accounts.id.initialize`. */
  interface GoogleCredentialResponse {
    /** The Google ID token (a JWT). Single-use — POST it to /api/auth/google. */
    credential?: string;
    /** How the credential was selected ("btn", "user", "auto", …). */
    select_by?: string;
    clientId?: string;
  }

  interface GoogleIdConfiguration {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
    ux_mode?: "popup" | "redirect";
    itp_support?: boolean;
  }

  interface GoogleButtonConfiguration {
    type?: "standard" | "icon";
    theme?: "outline" | "filled_blue" | "filled_black";
    size?: "large" | "medium" | "small";
    text?: "signin_with" | "signup_with" | "continue_with" | "signin";
    shape?: "rectangular" | "pill" | "circle" | "square";
    logo_alignment?: "left" | "center";
    /** Pixel width. GIS clamps this to 200–400. */
    width?: number;
    locale?: string;
  }

  interface GoogleAccountsId {
    initialize(config: GoogleIdConfiguration): void;
    renderButton(
      parent: HTMLElement,
      options: GoogleButtonConfiguration,
    ): void;
    disableAutoSelect(): void;
    cancel(): void;
  }

  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId;
      };
    };
  }
}
