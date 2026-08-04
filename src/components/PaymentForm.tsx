"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { PayerAccount } from "@/mocks/payerAccounts";
import {
  IBAN_FORMAT,
  createPaymentSchema,
  type PaymentFormInput,
  type PaymentFormValues,
} from "@/lib/paymentSchema";
import { formatAmount, type AmountLocale } from "@/lib/formatAmount";
import { IbanValidationError, validateIban } from "@/lib/validateIban";

type IbanStatus = "idle" | "checking" | "valid" | "invalid" | "error";

const defaultValues: PaymentFormInput = {
  payerAccountId: "",
  payeeAccount: "",
  payee: "",
  purpose: "",
  amount: "" as unknown as number,
};

type PaymentFormProps = {
  payerAccounts: PayerAccount[];
};

export default function PaymentForm({ payerAccounts }: PaymentFormProps) {
  const [locale, setLocale] = useState<AmountLocale>("en");
  const [ibanStatus, setIbanStatus] = useState<IbanStatus>("idle");
  const [submittedData, setSubmittedData] = useState<PaymentFormValues | null>(
    null,
  );

  const ibanCheckId = useRef(0);
  const paymentSchema = useMemo(
    () => createPaymentSchema(locale, payerAccounts),
    [locale, payerAccounts],
  );

  const {
    control,
    handleSubmit,
    watch,
    trigger,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormInput, unknown, PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    mode: "onBlur",
    defaultValues,
  });

  const payerAccountId = watch("payerAccountId");
  const amountValue = watch("amount");
  const selectedAccount = payerAccounts.find((a) => a.id === payerAccountId);

  useEffect(() => {
    if (amountValue) {
      void trigger("amount");
    }
    // Only re-run the amount validation when the locale (and therefore the
    // schema's balance-formatting) changes, not on every amount keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function checkIban(rawValue: string): Promise<boolean> {
    const formatted = rawValue.replace(/\s+/g, "").toUpperCase();

    if (!IBAN_FORMAT.test(formatted)) {
      setIbanStatus("idle");
      return false;
    }

    const id = ++ibanCheckId.current;
    setIbanStatus("checking");

    try {
      const valid = await validateIban(formatted);

      if (id !== ibanCheckId.current) return false;

      if (valid) {
        setIbanStatus("valid");
        clearErrors("payeeAccount");
        return true;
      }

      setIbanStatus("invalid");
      setError("payeeAccount", {
        type: "iban",
        message: "This IBAN could not be verified.",
      });

      return false;
    } catch (error) {
      if (id !== ibanCheckId.current) return false;

      setIbanStatus("error");
      setError("payeeAccount", {
        type: "iban",
        message:
          error instanceof IbanValidationError
            ? error.message
            : "Could not verify IBAN.",
      });

      return false;
    }
  }

  const onSubmit = async (data: PaymentFormValues) => {
    if (ibanStatus !== "valid") {
      const ok = await checkIban(data.payeeAccount);
      if (!ok) return;
    }

    setSubmittedData(data);
    reset(defaultValues);
    setIbanStatus("idle");
  };

  return (
    <Paper elevation={2} sx={{ maxWidth: 560, width: "100%", p: 4 }}>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}
      >
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          New Payment
        </Typography>
        <ToggleButtonGroup
          value={locale}
          exclusive
          size="small"
          onChange={(_, value) => value && setLocale(value)}
          aria-label="Amount format locale"
        >
          <ToggleButton value="en">EN</ToggleButton>
          <ToggleButton value="lt">LT</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        <Controller
          name="payerAccountId"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.payerAccountId}>
              <InputLabel id="payer-account-label">Payer Account</InputLabel>
              <Select
                {...field}
                labelId="payer-account-label"
                label="Payer Account"
                onChange={(e) => {
                  field.onChange(e);
                  if (amountValue) {
                    void trigger(["amount", "payerAccountId"]);
                  }
                }}
              >
                {payerAccounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: "space-between",
                        width: "100%",
                        gap: 2,
                      }}
                    >
                      <span>{account.iban}</span>
                      <Typography
                        component="span"
                        color={account.balance < 0 ? "error" : "text.secondary"}
                        sx={{ fontWeight: account.balance < 0 ? 600 : 400 }}
                      >
                        {formatAmount(account.balance, locale)} EUR
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {errors.payerAccountId?.message ??
                  (selectedAccount ? (
                    <Typography
                      component="span"
                      variant="caption"
                      color={
                        selectedAccount.balance < 0 ? "error" : "text.secondary"
                      }
                    >
                      Balance: {formatAmount(selectedAccount.balance, locale)}{" "}
                      EUR
                    </Typography>
                  ) : (
                    "Select the account to pay from."
                  ))}
              </FormHelperText>
            </FormControl>
          )}
        />

        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Amount"
              type="number"
              slotProps={{
                htmlInput: { step: "0.01", min: "0" },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">EUR</InputAdornment>
                  ),
                },
              }}
              value={field.value ?? ""}
              error={!!errors.amount}
              helperText={
                errors.amount?.message ??
                (amountValue && !Number.isNaN(Number(amountValue))
                  ? `= ${formatAmount(Number(amountValue), locale)} EUR`
                  : "Enter an amount between 0.01 and the account balance.")
              }
              fullWidth
            />
          )}
        />

        <Controller
          name="payeeAccount"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Payee Account (IBAN)"
              value={field.value ?? ""}
              onChange={(e) => {
                field.onChange(e);
                setIbanStatus("idle");
              }}
              onBlur={() => {
                field.onBlur();
                void checkIban(field.value ?? "");
              }}
              error={!!errors.payeeAccount}
              helperText={
                errors.payeeAccount?.message ??
                (ibanStatus === "valid"
                  ? "IBAN verified."
                  : "IBAN is checked against the validation service on blur.")
              }
              slotProps={{
                input: {
                  endAdornment:
                    ibanStatus === "checking" ? (
                      <InputAdornment position="end">
                        <CircularProgress size={18} />
                      </InputAdornment>
                    ) : undefined,
                },
              }}
              color={ibanStatus === "valid" ? "success" : undefined}
              fullWidth
            />
          )}
        />

        <Controller
          name="payee"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value ?? ""}
              label="Payee"
              error={!!errors.payee}
              helperText={
                errors.payee?.message ?? `${field.value?.length ?? 0}/70`
              }
              slotProps={{ htmlInput: { maxLength: 70 } }}
              fullWidth
            />
          )}
        />

        <Controller
          name="purpose"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value ?? ""}
              label="Purpose"
              multiline
              minRows={2}
              error={!!errors.purpose}
              helperText={
                errors.purpose?.message ?? `${field.value?.length ?? 0}/135`
              }
              slotProps={{ htmlInput: { maxLength: 135 } }}
              fullWidth
            />
          )}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting || ibanStatus === "checking"}
        >
          {isSubmitting ? "Submitting..." : "Submit Payment"}
        </Button>
      </Box>

      <Snackbar
        open={!!submittedData}
        autoHideDuration={5000}
        onClose={() => setSubmittedData(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSubmittedData(null)}
        >
          Payment of{" "}
          {submittedData ? formatAmount(submittedData.amount, locale) : ""} EUR
          to {submittedData?.payee} submitted.
        </Alert>
      </Snackbar>
    </Paper>
  );
}
