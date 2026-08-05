import { describe, expect, it } from "vitest";
import { formatAmount, parseAmount, toEditableAmount } from "./formatAmount";

describe("formatAmount", () => {
  it("formats using en-US grouping and decimal separators", () => {
    expect(formatAmount(1000.12, "en")).toBe("1,000.12");
  });

  it("formats using lt-LT grouping and decimal separators", () => {
    // lt-LT groups with a non-breaking space (U+00A0), written as an escape
    // here so it can't be mistaken for a plain space.
    expect(formatAmount(1000.12, "lt")).toBe("1 000,12");
  });

  it("pads to two decimals in both locales", () => {
    expect(formatAmount(1000.1, "en")).toBe("1,000.10");
    expect(formatAmount(1000.1, "lt")).toBe("1 000,10");
    expect(formatAmount(1000, "en")).toBe("1,000.00");
  });

  it("formats negative values", () => {
    expect(formatAmount(-5.87, "en")).toBe("-5.87");
  });

  it("formats zero", () => {
    expect(formatAmount(0, "en")).toBe("0.00");
  });

  it("rounds to two decimal places", () => {
    expect(formatAmount(1.005, "en")).toBe("1.01");
  });
});

describe("toEditableAmount", () => {
  it("drops grouping but keeps the locale decimal separator", () => {
    expect(toEditableAmount(1000.1, "en")).toBe("1000.1");
    expect(toEditableAmount(1000.1, "lt")).toBe("1000,1");
  });

  it("does not pad trailing zeros while editing", () => {
    expect(toEditableAmount(1000, "en")).toBe("1000");
  });
});

describe("parseAmount", () => {
  it("parses plain numbers", () => {
    expect(parseAmount("1000", "en")).toBe(1000);
    expect(parseAmount("0.01", "en")).toBe(0.01);
  });

  it("parses its own formatted output round-trip", () => {
    expect(parseAmount(formatAmount(1000.1, "en"), "en")).toBe(1000.1);
    expect(parseAmount(formatAmount(1000.1, "lt"), "lt")).toBe(1000.1);
  });

  it("treats the last separator as the decimal when both appear", () => {
    expect(parseAmount("1,000.10", "en")).toBe(1000.1);
    expect(parseAmount("1.000,10", "lt")).toBe(1000.1);
  });

  it("accepts either decimal separator regardless of locale", () => {
    expect(parseAmount("1000,5", "en")).toBe(1000.5);
    expect(parseAmount("1000.5", "lt")).toBe(1000.5);
  });

  it("reads an ambiguous lone separator the way the locale would", () => {
    // "1,000" is grouping in en-US...
    expect(parseAmount("1,000", "en")).toBe(1000);
    // ...but lt-LT groups with a space, so a comma there is a decimal.
    expect(parseAmount("1,000", "lt")).toBe(1);
  });

  it("treats a repeated separator as grouping", () => {
    expect(parseAmount("1,000,000", "en")).toBe(1000000);
  });

  it("ignores whitespace, including non-breaking spaces", () => {
    expect(parseAmount("1 000,10", "lt")).toBe(1000.1);
    expect(parseAmount("  1000  ", "en")).toBe(1000);
  });

  it("parses negative values", () => {
    expect(parseAmount("-5.87", "en")).toBe(-5.87);
  });

  it("returns null for empty or non-numeric input", () => {
    expect(parseAmount("", "en")).toBeNull();
    expect(parseAmount("   ", "en")).toBeNull();
    expect(parseAmount("abc", "en")).toBeNull();
    expect(parseAmount("12abc", "en")).toBeNull();
  });
});
