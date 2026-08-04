import { describe, expect, it } from "vitest";
import { ApiResultError } from "@/lib/api-result";
import { isConcurrencyError, messageForError } from "@/lib/social/errors";

describe("messageForError — (code, status) disambiguation", () => {
  it("REPORT_NOT_FOUND at 404 means the report itself is gone", () => {
    const err = new ApiResultError("Not found", { code: "REPORT_NOT_FOUND", status: 404 });
    expect(messageForError(err)).toBe("Không tìm thấy báo cáo này. Có thể báo cáo đã được xử lý.");
  });

  it("REPORT_NOT_FOUND at 400 means the reported content itself is gone", () => {
    const err = new ApiResultError("Bad request", { code: "REPORT_NOT_FOUND", status: 400 });
    expect(messageForError(err)).toBe("Nội dung bạn muốn báo cáo không còn tồn tại.");
  });

  it("COMMUNITY_APPLICATION_NOT_ALLOWED at 409 means already applied", () => {
    const err = new ApiResultError("Conflict", { code: "COMMUNITY_APPLICATION_NOT_ALLOWED", status: 409 });
    expect(messageForError(err)).toContain("đã đăng ký");
  });

  it("COMMUNITY_APPLICATION_NOT_ALLOWED at 403 means it's the author's own post", () => {
    const err = new ApiResultError("Forbidden", { code: "COMMUNITY_APPLICATION_NOT_ALLOWED", status: 403 });
    expect(messageForError(err)).toContain("chính mình");
  });

  it("falls back to a code-only message when no (code, status) pair matches", () => {
    const err = new ApiResultError("x", { code: "VOUCHER_EXPIRED", status: 418 });
    expect(messageForError(err)).toBe("Mã giảm giá đã hết hạn.");
  });

  it("surfaces validation details rather than a generic message", () => {
    const err = new ApiResultError("Invalid request data", {
      code: "VALIDATION_ERROR",
      status: 400,
      details: ["Title: Bắt buộc"],
    });
    // Code-level mapping takes priority for VALIDATION_ERROR (a curated
    // message exists); the details-priority path is exercised by a code the
    // table does NOT curate.
    const errNoCodeMatch = new ApiResultError("Invalid request data", {
      code: "UNMAPPED_CODE",
      status: 400,
      details: ["Title: Bắt buộc"],
    });
    expect(messageForError(errNoCodeMatch)).toBe("Title: Bắt buộc");
    expect(messageForError(err)).toBeTruthy();
  });
});

describe("isConcurrencyError", () => {
  it("is true for CONCURRENCY_CONFLICT", () => {
    expect(isConcurrencyError(new ApiResultError("x", { code: "CONCURRENCY_CONFLICT" }))).toBe(true);
  });

  it("is true for COMMUNITY_POST_FULL", () => {
    expect(isConcurrencyError(new ApiResultError("x", { code: "COMMUNITY_POST_FULL" }))).toBe(true);
  });

  it("is true for a bare 409 regardless of code", () => {
    expect(isConcurrencyError(new ApiResultError("x", { status: 409 }))).toBe(true);
  });

  it("is false for an unrelated error", () => {
    expect(isConcurrencyError(new ApiResultError("x", { code: "VOUCHER_EXPIRED", status: 400 }))).toBe(false);
  });

  it("is false for a plain Error", () => {
    expect(isConcurrencyError(new Error("boom"))).toBe(false);
  });
});
