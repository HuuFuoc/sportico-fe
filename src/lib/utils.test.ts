import { describe, expect, it } from "vitest";
import { formatCurrencyVnd } from "@/lib/utils";

describe("formatCurrencyVnd", () => {
  it("formats a whole VND amount with no decimals and a currency symbol", () => {
    const out = formatCurrencyVnd(1_500_000);
    // Intl output uses a non-breaking space before "₫" in vi-VN — normalise it.
    expect(out.replace(/ /g, " ")).toBe("1.500.000 ₫");
  });

  it("formats zero", () => {
    expect(formatCurrencyVnd(0).replace(/ /g, " ")).toBe("0 ₫");
  });

  it("never introduces fraction digits", () => {
    expect(formatCurrencyVnd(999)).not.toMatch(/[,.]\d{1,2}\s*₫$/);
  });
});
