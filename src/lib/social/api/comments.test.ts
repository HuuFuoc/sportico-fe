import { describe, expect, it } from "vitest";
import { rootCommentId } from "@/lib/social/api/comments";
import type { CommunityCommentResponse } from "@/lib/social/types";

function comment(overrides: Partial<CommunityCommentResponse>): CommunityCommentResponse {
  return {
    id: "child-id",
    postId: "post-1",
    author: null,
    parentCommentId: null,
    content: "hi",
    status: "active",
    replyCount: 0,
    replies: [],
    canEdit: false,
    canModerate: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("rootCommentId", () => {
  it("returns the comment's own id when it is a root comment", () => {
    expect(rootCommentId(comment({ id: "root-1", parentCommentId: null }))).toBe("root-1");
  });

  it("returns the parent's id when replying to a reply — backend only nests one level", () => {
    expect(rootCommentId(comment({ id: "reply-2", parentCommentId: "root-1" }))).toBe("root-1");
  });
});
