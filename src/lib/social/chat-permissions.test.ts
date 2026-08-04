import { describe, expect, it } from "vitest";
import { canRespondToRequest, composerPermission } from "@/lib/social/chat-permissions";

const ME = "user-me";
const OTHER = "user-other";

describe("composerPermission", () => {
  it("blocks sending in an active room when blocked", () => {
    const perm = composerPermission({ status: "active", requestedByUserId: ME }, ME, true);
    expect(perm).toEqual({ canSend: false, reason: "blocked" });
  });

  it("allows both sides to send in an active room", () => {
    expect(composerPermission({ status: "active", requestedByUserId: OTHER }, ME, false)).toEqual({ canSend: true });
  });

  it("allows the requester to send while pending", () => {
    const perm = composerPermission({ status: "pending", requestedByUserId: ME }, ME, false);
    expect(perm).toEqual({ canSend: true });
  });

  it("blocks the receiver from sending while pending", () => {
    const perm = composerPermission({ status: "pending", requestedByUserId: OTHER }, ME, false);
    expect(perm).toEqual({ canSend: false, reason: "pending_receiver" });
  });

  it("is read-only forever once rejected, even for the original requester", () => {
    const perm = composerPermission({ status: "rejected", requestedByUserId: ME }, ME, false);
    expect(perm).toEqual({ canSend: false, reason: "rejected" });
  });

  it("blocks when there is no room yet", () => {
    expect(composerPermission(null, ME, false)).toEqual({ canSend: false, reason: "unknown" });
  });
});

describe("canRespondToRequest", () => {
  it("only the receiver of a pending request may respond", () => {
    expect(canRespondToRequest({ status: "pending", requestedByUserId: OTHER }, ME)).toBe(true);
    expect(canRespondToRequest({ status: "pending", requestedByUserId: ME }, ME)).toBe(false);
  });

  it("is false once the room is no longer pending", () => {
    expect(canRespondToRequest({ status: "active", requestedByUserId: OTHER }, ME)).toBe(false);
    expect(canRespondToRequest({ status: "rejected", requestedByUserId: OTHER }, ME)).toBe(false);
  });
});
