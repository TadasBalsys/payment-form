import { describe, expect, it } from "vitest";
import {
  countFractionDigits,
  formatAmount,
  isAmountInput,
  parseAmount,
  toEditableAmount,
} from "./formatAmount";

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
    expect(toEditableAmount(1000.1, "en")).toBe("1000.10");
    expect(toEditableAmount(1000.1, "lt")).toBe("1000,10");
  });

  it("keeps the cents padded, so focusing never drops a digit", () => {
    expect(toEditableAmount(1000, "en")).toBe("1000.00");
    expect(toEditableAmount(35212231.1, "lt")).toBe("35212231,10");
  });

  it("differs from the display form only by its grouping separators", () => {
    const displayed = formatAmount(35212231.1, "lt");
    expect(displayed).toBe("35 212 231,10");
    expect(toEditableAmount(35212231.1, "lt")).toBe(
      displayed.replace(/[\s ]/g, ""),
    );
  });
});

describe("isAmountInput", () => {
  it("accepts digits, separators and grouped forms", () => {
    expect(isAmountInput("1000")).toBe(true);
    expect(isAmountInput("1,000.01")).toBe(true);
    expect(isAmountInput("1 000,01")).toBe(true);
    expect(isAmountInput("-5.87")).toBe(true);
  });

  it("accepts the empty and partial states typing passes through", () => {
    expect(isAmountInput("")).toBe(true);
    expect(isAmountInput("-")).toBe(true);
    expect(isAmountInput("1.")).toBe(true);
  });

  it("rejects letters and symbols", () => {
    expect(isAmountInput("abc")).toBe(false);
    expect(isAmountInput("12abc")).toBe(false);
    expect(isAmountInput("10 EUR")).toBe(false);
    expect(isAmountInput("1+2")).toBe(false);
  });

  it("rejects the exponent notation a number input would accept", () => {
    expect(isAmountInput("1e5")).toBe(false);
  });

  it("rejects a minus that is not leading", () => {
    expect(isAmountInput("1-2")).toBe(false);
  });
});

describe("countFractionDigits", () => {
  it("counts the digits after the decimal separator", () => {
    expect(countFractionDigits("10.5", "en")).toBe(1);
    expect(countFractionDigits("10.55", "en")).toBe(2);
    expect(countFractionDigits("10.555", "en")).toBe(3);
    expect(countFractionDigits("10,555", "lt")).toBe(3);
  });

  it("returns zero when there is no decimal separator", () => {
    expect(countFractionDigits("1000", "en")).toBe(0);
    expect(countFractionDigits("", "en")).toBe(0);
  });

  it("does not count grouped digits as decimals", () => {
    expect(countFractionDigits("1,000", "en")).toBe(0);
    expect(countFractionDigits("1,000,000", "en")).toBe(0);
    expect(countFractionDigits("1 000", "lt")).toBe(0);
  });

  it("counts only what follows the last separator when both appear", () => {
    expect(countFractionDigits("1,000.10", "en")).toBe(2);
    expect(countFractionDigits("1.000,105", "lt")).toBe(3);
  });

  it("agrees with how parseAmount reads the same input", () => {
    // "1,000" is grouping in en-US but a decimal separator in lt-LT, and the
    // fraction count has to follow that same reading.
    expect(parseAmount("1,000", "en")).toBe(1000);
    expect(countFractionDigits("1,000", "en")).toBe(0);
    expect(parseAmount("1,000", "lt")).toBe(1);
    expect(countFractionDigits("1,000", "lt")).toBe(3);
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
