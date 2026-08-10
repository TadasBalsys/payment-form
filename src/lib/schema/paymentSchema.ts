import { z } from "zod";
import type { PayerAccount } from "@/mocks/payerAccounts";
import {
  MAX_FRACTION_DIGITS,
  formatAmount,
  type AmountLocale,
} from "../utils/formatAmount";

export const IBAN_FORMAT = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/;

/**
 * The field itself already refuses a third decimal, so this only backstops
 * values that never went through it (autofill, a restored draft, tests).
 */
const withinCents = (value: number) => {
  const fraction = value.toString().split(".")[1];
  return !fraction || fraction.length <= MAX_FRACTION_DIGITS;
};

const baseFields = {
  payerAccountId: z.string().min(1, "Please select a payer account."),
  payeeAccount: z
    .string()
    .min(1, "Payee account is required.")
    .transform((value) => value.replace(/\s+/g, "").toUpperCase())
    .refine((value) => IBAN_FORMAT.test(value), {
      message: "Enter a valid IBAN (e.g. LT307300010172619160).",
    }),
  payee: z
    .string()
    .min(1, "Payee is required.")
    .max(70, "Payee must be at most 70 characters."),
  purpose: z
    .string()
    .min(3, "Purpose must be at least 3 characters.")
    .max(135, "Purpose must be at most 135 characters."),
  amount: z.coerce
    .number({ error: "Enter a valid amount." })
    .min(0.01, "Amount must be at least 0.01.")
    .refine(withinCents, "Amount can have at most 2 decimal places."),
};

export function createPaymentSchema(
  locale: AmountLocale,
  payerAccounts: PayerAccount[]
) {
  return z.object(baseFields).superRefine((data, ctx) => {
    const account = payerAccounts.find((a) => a.id === data.payerAccountId);

    if (account && data.amount > account.balance) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: `Amount exceeds available balance (${formatAmount(
          account.balance,
          locale
        )}).`,
      });
    }
  });
}

export type PaymentFormValues = z.infer<ReturnType<typeof createPaymentSchema>>;
export type PaymentFormInput = z.input<ReturnType<typeof createPaymentSchema>>;
