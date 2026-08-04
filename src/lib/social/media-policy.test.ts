import { describe, expect, it } from "vitest";
import { mediaFieldForUpdate } from "@/lib/social/media-policy";
import type { CommunityPostMediaRequest } from "@/lib/social/types";

const sampleMedia: CommunityPostMediaRequest[] = [{ mediaType: "image", url: "https://x/1.jpg" }];

describe("mediaFieldForUpdate", () => {
  it("omits the field entirely when the user never touched media — keeps existing gallery", () => {
    expect(mediaFieldForUpdate(false, [])).toBeUndefined();
    expect(mediaFieldForUpdate(false, sampleMedia)).toBeUndefined();
  });

  it("sends an empty array when touched and the user removed everything — deletes all media", () => {
    expect(mediaFieldForUpdate(true, [])).toEqual([]);
  });

  it("sends the full array when touched and media remains — replaces the set", () => {
    expect(mediaFieldForUpdate(true, sampleMedia)).toBe(sampleMedia);
  });
});
