import { describe, expect, it } from "vitest";
import {
  getAuthErrorMessage,
  googleAuthMessage,
  isGoogleUnavailable,
} from "@/lib/auth-error-messages";
import { safeInternalPath } from "@/lib/auth-post-login";

// Error codes below were captured from the live backend (see the report): the
// two 401 shapes both carry `details: null`, which must never be indexed.

describe("googleAuthMessage", () => {
  it("maps the codes the backend actually returns", () => {
    expect(googleAuthMessage("AUTH_GOOGLE_INVALID_TOKEN")).toBe(
      "Đăng nhập Google thất bại. Vui lòng thử lại.",
    );
    expect(googleAuthMessage("AUTH_GOOGLE_EXCHANGE_CODE_INVALID")).toBe(
      "Liên kết đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
    );
    expect(googleAuthMessage("AUTH_GOOGLE_LOGIN_FAILED")).toBe(
      "Đăng nhập Google không thành công. Vui lòng thử lại.",
    );
    expect(googleAuthMessage("AUTH_GOOGLE_EXTERNAL_PRINCIPAL_INVALID")).toBe(
      "Phiên đăng nhập Google đã hết hiệu lực. Vui lòng thử lại.",
    );
  });

  it("splits COMMON_ACCOUNT_NOT_ACTIVE by HTTP status", () => {
    expect(googleAuthMessage("COMMON_ACCOUNT_NOT_ACTIVE", 403)).toBe(
      "Tài khoản của bạn đã bị khóa.",
    );
    expect(googleAuthMessage("COMMON_ACCOUNT_NOT_ACTIVE", 401)).toBe(
      "Tài khoản của bạn chưa được kích hoạt.",
    );
    // No status available → the neutral copy, never an invented one.
    expect(googleAuthMessage("COMMON_ACCOUNT_NOT_ACTIVE")).toBe(
      "Tài khoản của bạn chưa hoạt động hoặc đã bị khóa.",
    );
  });

  it("returns undefined for unknown codes so the caller can defer", () => {
    expect(googleAuthMessage(undefined)).toBeUndefined();
    expect(googleAuthMessage("SOMETHING_NEW")).toBeUndefined();
  });
});

describe("getAuthErrorMessage", () => {
  it("always returns a sentence, never the raw code", () => {
    expect(getAuthErrorMessage("AUTH_GOOGLE_EXCHANGE_CODE_EXPIRED")).toBe(
      "Liên kết đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    );
    // Unknown / missing redirect codes still produce user-facing copy.
    expect(getAuthErrorMessage(null)).toBe(
      "Đăng nhập Google không thành công. Vui lòng thử lại.",
    );
    expect(getAuthErrorMessage("WHATEVER_NEW_CODE")).not.toContain(
      "WHATEVER_NEW_CODE",
    );
  });
});

describe("isGoogleUnavailable", () => {
  it("is true only for the configuration-missing case", () => {
    expect(isGoogleUnavailable("AUTH_GOOGLE_CONFIGURATION_MISSING", 503)).toBe(true);
    expect(isGoogleUnavailable(undefined, 503)).toBe(true);
    expect(isGoogleUnavailable("AUTH_GOOGLE_INVALID_TOKEN", 401)).toBe(false);
    expect(isGoogleUnavailable(undefined, undefined)).toBe(false);
  });
});

describe("safeInternalPath", () => {
  it("accepts same-origin paths and rejects everything else", () => {
    expect(safeInternalPath("/learner/schedule")).toBe("/learner/schedule");
    expect(safeInternalPath("/coach/settings?fromLogin=1")).toBe(
      "/coach/settings?fromLogin=1",
    );
    // Open-redirect vectors.
    expect(safeInternalPath("//evil.com")).toBeNull();
    expect(safeInternalPath("https://evil.com")).toBeNull();
    expect(safeInternalPath("evil.com")).toBeNull();
    expect(safeInternalPath(null)).toBeNull();
    expect(safeInternalPath("")).toBeNull();
  });
});
