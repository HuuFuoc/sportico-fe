import { describe, expect, it } from "vitest";
import { scrubPathWithQuery, scrubUrl } from "@/lib/analytics-scrub";

describe("scrubPathWithQuery", () => {
  it("redacts the Google one-time exchange code", () => {
    const params = new URLSearchParams("code=abc123&utm_source=email");
    expect(scrubPathWithQuery("/auth/google/callback", params)).toBe(
      "/auth/google/callback?code=redacted&utm_source=email",
    );
  });

  it("redacts verification and reset tokens", () => {
    expect(
      scrubPathWithQuery("/verify-email", new URLSearchParams("token=secret")),
    ).toBe("/verify-email?token=redacted");
    expect(
      scrubPathWithQuery("/reset-password", new URLSearchParams("Token=secret")),
    ).toBe("/reset-password?Token=redacted");
  });

  it("leaves ordinary paths and params untouched", () => {
    expect(scrubPathWithQuery("/coaches", new URLSearchParams())).toBe("/coaches");
    expect(
      scrubPathWithQuery("/login", new URLSearchParams("redirect=/learner")),
    ).toBe("/login?redirect=%2Flearner");
  });
});

describe("scrubUrl", () => {
  it("redacts secrets in an absolute referrer", () => {
    expect(scrubUrl("https://sportico.click/auth/google/callback?code=xyz")).toBe(
      "https://sportico.click/auth/google/callback?code=redacted",
    );
  });

  it("tolerates a non-URL string (empty document.referrer)", () => {
    expect(scrubUrl("")).toBe("");
  });
});
