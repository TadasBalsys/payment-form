import { describe, expect, it } from "vitest";
import type { PayerAccount } from "@/mocks/payerAccounts";
import { createPaymentSchema } from "./paymentSchema";

const payerAccounts: PayerAccount[] = [
  { id: "1", iban: "LT307300010172619160", balance: 1000.12 },
  { id: "2", iban: "LT307300010172619161", balance: 2.43 },
  { id: "3", iban: "LT307300010172619162", balance: -5.87 },
];

const validPayload = {
  payerAccountId: "1",
  payeeAccount: "LT307300010172619199",
  payee: "Jane Doe",
  purpose: "Invoice #123",
  amount: 10,
};

function schema(locale: "en" | "lt" = "en") {
  return createPaymentSchema(locale, payerAccounts);
}

type SafeParseResult = ReturnType<ReturnType<typeof schema>["safeParse"]>;

function issueFor(result: SafeParseResult, field: string) {
  return result.error?.issues.find((issue) => issue.path[0] === field);
}

describe("createPaymentSchema", () => {
  it("accepts a fully valid payload", () => {
    const result = schema().safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  describe("payerAccountId", () => {
    it("requires a non-empty value", () => {
      const result = schema().safeParse({ ...validPayload, payerAccountId: "" });
      expect(result.success).toBe(false);
      expect(issueFor(result, "payerAccountId")?.message).toBe(
        "Please select a payer account.",
      );
    });

    it("succeeds and skips the balance check when the id matches no account", () => {
      const result = schema().safeParse({
        ...validPayload,
        payerAccountId: "unknown-id",
        amount: 999999,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("payeeAccount", () => {
    it("requires a non-empty value", () => {
      const result = schema().safeParse({ ...validPayload, payeeAccount: "" });
      expect(result.success).toBe(false);
    });

    it("rejects a malformed IBAN", () => {
      const result = schema().safeParse({ ...validPayload, payeeAccount: "1234" });
      expect(result.success).toBe(false);
      expect(issueFor(result, "payeeAccount")?.message).toBe(
        "Enter a valid IBAN (e.g. LT307300010172619160).",
      );
    });

    it("strips whitespace and uppercases a valid IBAN before validating", () => {
      const result = schema().safeParse({
        ...validPayload,
        payeeAccount: "lt30 7300 0101 7261 9199",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.payeeAccount).toBe("LT307300010172619199");
      }
    });
  });

  describe("payee", () => {
    it("requires a non-empty value", () => {
      const result = schema().safeParse({ ...validPayload, payee: "" });
      expect(result.success).toBe(false);
    });

    it("allows exactly 70 characters", () => {
      const result = schema().safeParse({ ...validPayload, payee: "a".repeat(70) });
      expect(result.success).toBe(true);
    });

    it("rejects 71 characters", () => {
      const result = schema().safeParse({ ...validPayload, payee: "a".repeat(71) });
      expect(result.success).toBe(false);
      expect(issueFor(result, "payee")?.message).toBe(
        "Payee must be at most 70 characters.",
      );
    });
  });

  describe("purpose", () => {
    it("rejects fewer than 3 characters", () => {
      const result = schema().safeParse({ ...validPayload, purpose: "ab" });
      expect(result.success).toBe(false);
      expect(issueFor(result, "purpose")?.message).toBe(
        "Purpose must be at least 3 characters.",
      );
    });

    it("allows exactly 3 and exactly 135 characters", () => {
      expect(schema().safeParse({ ...validPayload, purpose: "abc" }).success).toBe(
        true,
      );
      expect(
        schema().safeParse({ ...validPayload, purpose: "a".repeat(135) }).success,
      ).toBe(true);
    });

    it("rejects 136 characters", () => {
      const result = schema().safeParse({
        ...validPayload,
        purpose: "a".repeat(136),
      });
      expect(result.success).toBe(false);
      expect(issueFor(result, "purpose")?.message).toBe(
        "Purpose must be at most 135 characters.",
      );
    });
  });

  describe("amount", () => {
    it("rejects zero", () => {
      const result = schema().safeParse({ ...validPayload, amount: 0 });
      expect(result.success).toBe(false);
      expect(issueFor(result, "amount")?.message).toBe(
        "Amount must be at least 0.01.",
      );
    });

    it("accepts 0.01", () => {
      const result = schema().safeParse({ ...validPayload, amount: 0.01 });
      expect(result.success).toBe(true);
    });

    it("rejects a non-numeric value", () => {
      const result = schema().safeParse({ ...validPayload, amount: "abc" });
      expect(result.success).toBe(false);
    });

    it("rejects more than two decimal places", () => {
      const result = schema().safeParse({ ...validPayload, amount: 10.555 });
      expect(result.success).toBe(false);
      expect(issueFor(result, "amount")?.message).toBe(
        "Amount can have at most 2 decimal places.",
      );
    });

    it("accepts one or two decimal places", () => {
      expect(schema().safeParse({ ...validPayload, amount: 10.5 }).success).toBe(
        true,
      );
      expect(
        schema().safeParse({ ...validPayload, amount: 10.55 }).success,
      ).toBe(true);
    });

    it("rejects a coerced string carrying a third decimal", () => {
      const result = schema().safeParse({ ...validPayload, amount: "10.555" });
      expect(result.success).toBe(false);
    });
  });

  describe("balance check", () => {
    it("rejects an amount exceeding the selected account's balance (en locale)", () => {
      const result = schema("en").safeParse({
        ...validPayload,
        payerAccountId: "1",
        amount: 1000.13,
      });
      expect(result.success).toBe(false);
      expect(issueFor(result, "amount")?.message).toBe(
        "Amount exceeds available balance (1,000.12).",
      );
    });

    it("rejects an amount exceeding the selected account's balance (lt locale)", () => {
      const result = schema("lt").safeParse({
        ...validPayload,
        payerAccountId: "1",
        amount: 1000.13,
      });
      expect(result.success).toBe(false);
      expect(issueFor(result, "amount")?.message).toBe(
        "Amount exceeds available balance (1 000,12).",
      );
    });

    it("accepts an amount equal to the available balance", () => {
      const result = schema().safeParse({
        ...validPayload,
        payerAccountId: "1",
        amount: 1000.12,
      });
      expect(result.success).toBe(true);
    });

    it("rejects any positive amount against a negative-balance account", () => {
      const result = schema().safeParse({
        ...validPayload,
        payerAccountId: "3",
        amount: 0.01,
      });
      expect(result.success).toBe(false);
      expect(issueFor(result, "amount")?.message).toBe(
        "Amount exceeds available balance (-5.87).",
      );
    });
  });
});
