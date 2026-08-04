import { describe, expect, it } from "vitest";
import { formatAmount } from "./formatAmount";

describe("formatAmount", () => {
  it("formats using en-US grouping and decimal separators", () => {
    expect(formatAmount(1000.12, "en")).toBe("1,000.12");
  });

  it("formats using lt-LT grouping and decimal separators", () => {
    // lt-LT uses a non-breaking space as the grouping separator and a comma decimal.
    expect(formatAmount(1000.12, "lt")).toBe("1 000,12");
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
