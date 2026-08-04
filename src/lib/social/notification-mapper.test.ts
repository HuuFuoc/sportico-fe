import { describe, expect, it } from "vitest";
import { notificationRoute, notificationTitleVi } from "@/lib/social/notification-mapper";

describe("notificationRoute", () => {
  it("routes each documented type to its list page", () => {
    expect(notificationRoute("post")).toBe("/community");
    expect(notificationRoute("message")).toBe("/messages");
    expect(notificationRoute("report")).toBe("/community/my-posts");
    expect(notificationRoute("system")).toBe("/community/my-posts");
  });

  it("is case-insensitive", () => {
    expect(notificationRoute("Post")).toBe("/community");
  });

  it("falls back to a safe list page for an unrecognised type — never a detail deep-link", () => {
    expect(notificationRoute("something_new")).toBe("/community/my-posts");
    expect(notificationRoute(null)).toBe("/community/my-posts");
    expect(notificationRoute(undefined)).toBe("/community/my-posts");
  });
});

describe("notificationTitleVi", () => {
  it("translates a recognised English phrase", () => {
    expect(notificationTitleVi({ title: "New comment on your post", type: "post" })).toBe(
      "Có bình luận mới trên bài đăng của bạn",
    );
  });

  it("falls back to a generic per-type heading when no keyword matches", () => {
    expect(notificationTitleVi({ title: "Some unrelated backend copy", type: "message" })).toBe("Tin nhắn mới");
  });

  it("never returns a blank string — falls back to the raw title as a last resort", () => {
    expect(notificationTitleVi({ title: "Unmapped text", type: "unknown_type" })).toBe("Unmapped text");
  });
});
