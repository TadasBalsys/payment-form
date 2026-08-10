import { ChangeEvent, useState } from "react";
import type {
  ControllerRenderProps,
  FieldErrors,
  UseFormTrigger,
} from "react-hook-form";
import { InputAdornment, TextField } from "@mui/material";
import type { PaymentFormInput } from "@/lib/schema/paymentSchema";
import {
  MAX_FRACTION_DIGITS,
  countFractionDigits,
  formatAmount,
  isAmountInput,
  parseAmount,
  toEditableAmount,
  type AmountLocale,
} from "@/lib/utils/formatAmount";

type AmountFieldProps = {
  field: ControllerRenderProps<PaymentFormInput, "amount">;
  error?: FieldErrors<PaymentFormInput>["amount"];
  locale: AmountLocale;
  trigger: UseFormTrigger<PaymentFormInput>;
};

const toNumber = (value: unknown): number | null => {
  if (value === "" || value === null || value === undefined) return null;

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const AmountField = ({ field, error, locale, trigger }: AmountFieldProps) => {
  const [draft, setDraft] = useState<string | null>(null);

  const value = toNumber(field.value);

  const fallback = typeof field.value === "string" ? field.value : "";
  const display =
    draft ?? (value !== null ? formatAmount(value, locale) : fallback);

  const handleFocus = () => {
    setDraft(value !== null ? toEditableAmount(value, locale) : fallback);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;

    if (!isAmountInput(next)) return;

    if (countFractionDigits(next, locale) > MAX_FRACTION_DIGITS) return;

    setDraft(next);
    const parsed = parseAmount(next, locale);

    field.onChange(parsed ?? (next.trim() === "" ? "" : next));
    void trigger("amount");
  };

  const handleBlur = () => {
    setDraft(null);
    field.onBlur();
  };

  return (
    <TextField
      {...field}
      label="Amount"
      type="text"
      value={display}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      slotProps={{
        htmlInput: { inputMode: "decimal" },
        input: {
          endAdornment: <InputAdornment position="end">EUR</InputAdornment>,
        },
      }}
      error={!!error}
      helperText={
        error?.message ??
        "Enter an amount between 0.01 and the account balance."
      }
      fullWidth
    />
  );
};

export default AmountField;
