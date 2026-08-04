import type { ControllerRenderProps, FieldError, UseFormTrigger } from "react-hook-form";
import {
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import type { PayerAccount } from "@/mocks/payerAccounts";
import type { PaymentFormInput } from "@/lib/paymentSchema";
import { formatAmount, type AmountLocale } from "@/lib/formatAmount";

type AccountSelectorProps = {
  field: ControllerRenderProps<PaymentFormInput, "payerAccountId">;
  amountValue: PaymentFormInput["amount"];
  trigger: UseFormTrigger<PaymentFormInput>;
  payerAccounts: PayerAccount[];
  error?: FieldError;
  selectedAccount?: PayerAccount;
  locale: AmountLocale;
};

const AccountSelector = ({
  field,
  amountValue,
  trigger,
  payerAccounts,
  error,
  selectedAccount,
  locale,
}: AccountSelectorProps) => {
  return (
    <>
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
        {error?.message ??
          (selectedAccount ? (
            <Typography
              component="span"
              variant="caption"
              color={selectedAccount.balance < 0 ? "error" : "text.secondary"}
            >
              Balance: {formatAmount(selectedAccount.balance, locale)} EUR
            </Typography>
          ) : (
            "Select the account to pay from."
          ))}
      </FormHelperText>
    </>
  );
};

export default AccountSelector;
