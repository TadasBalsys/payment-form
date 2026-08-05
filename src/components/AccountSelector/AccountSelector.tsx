import type { ControllerRenderProps, FieldError, UseFormTrigger } from "react-hook-form";
import {
  Box,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import type { PayerAccount } from "@/mocks/payerAccounts";
import type { PaymentFormInput } from "@/lib/schema/paymentSchema";
import { formatAmount, type AmountLocale } from "@/lib/utils/formatAmount";

type AccountSelectorProps = {
  field: ControllerRenderProps<PaymentFormInput, "payerAccountId">;
  amountValue: PaymentFormInput["amount"];
  payerAccounts: PayerAccount[];
  error?: FieldError;
  selectedAccount?: PayerAccount;
  locale: AmountLocale;
  trigger: UseFormTrigger<PaymentFormInput>;
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
const handleChange = (e: SelectChangeEvent<string>) => {
  field.onChange(e);

  if (amountValue) {
    void trigger(["amount", "payerAccountId"]);
  }
};

  return (
    <>
      <InputLabel id="payer-account-label">Payer Account</InputLabel>
      <Select
        {...field}
        labelId="payer-account-label"
        label="Payer Account"
        onChange={handleChange}
        renderValue={(value) =>
          payerAccounts.find((account) => account.id === value)?.iban ?? ""
        }
      >
        {payerAccounts.map((account) => (
          <MenuItem
            key={account.id}
            value={account.id}
            sx={{ whiteSpace: "normal" }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              sx={{
                justifyContent: "space-between",
                alignItems: { xs: "stretch", sm: "center" },
                width: "100%",
                minWidth: 0,
                gap: { xs: 0.25, sm: 2 },
              }}
            >
              <Box component="span" sx={{ overflowWrap: "anywhere" }}>
                {account.iban}
              </Box>
              <Typography
                component="span"
                color={account.balance < 0 ? "error" : "text.secondary"}
                sx={{
                  fontWeight: account.balance < 0 ? 600 : 400,
                  whiteSpace: "nowrap",
                  textAlign: { xs: "right", sm: "left" },
                }}
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
            " "
          ))}
      </FormHelperText>
    </>
  );
};

export default AccountSelector;
