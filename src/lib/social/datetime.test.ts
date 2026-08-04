import { describe, expect, it } from "vitest";
import { parseUtc } from "@/lib/social/datetime";

describe("parseUtc", () => {
  it("parses a timestamp that already has a Z suffix as-is", () => {
    const d = parseUtc("2026-08-04T09:00:00Z");
    expect(d.toISOString()).toBe("2026-08-04T09:00:00.000Z");
  });

  it("treats a Z-less timestamp as UTC, not local time", () => {
    // Without the fix this would be parsed in the runner's local timezone.
    const d = parseUtc("2026-08-04T09:00:00");
    expect(d.toISOString()).toBe("2026-08-04T09:00:00.000Z");
  });

  it("leaves a timestamp with an explicit offset untouched", () => {
    const d = parseUtc("2026-08-04T09:00:00+07:00");
    expect(d.toISOString()).toBe("2026-08-04T02:00:00.000Z");
  });
});
