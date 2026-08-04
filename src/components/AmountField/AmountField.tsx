import { useState } from "react";
import type {
  ControllerRenderProps,
  FieldErrors,
  UseFormTrigger,
} from "react-hook-form";
import { InputAdornment, TextField } from "@mui/material";
import type { PaymentFormInput } from "@/lib/paymentSchema";
import {
  formatAmount,
  parseAmount,
  toEditableAmount,
  type AmountLocale,
} from "@/lib/formatAmount";

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

  return (
    <TextField
      {...field}
      label="Amount"
      type="text"
      value={display}
      onFocus={() => {
        setDraft(value !== null ? toEditableAmount(value, locale) : fallback);
      }}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);

        const parsed = parseAmount(next, locale);
        // Hand unparseable text straight to the schema so it reports the error,
        // and an empty string so the "required" rule still fires.
        field.onChange(parsed ?? (next.trim() === "" ? "" : next));
        void trigger("amount");
      }}
      onBlur={() => {
        setDraft(null);
        field.onBlur();
      }}
      slotProps={{
        // inputMode has to go on the inner <input>; MUI forwards unrecognised
        // top-level props to the root element instead.
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
