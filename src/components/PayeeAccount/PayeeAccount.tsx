import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { ControllerRenderProps, FieldError } from "react-hook-form";
import { CircularProgress, InputAdornment, TextField } from "@mui/material";
import type { PaymentFormInput } from "@/lib/schema/paymentSchema";
import type { IbanStatus } from "@/lib/utils/validateIban";

type PayeeAccountProps = {
  field: ControllerRenderProps<PaymentFormInput, "payeeAccount">;
  error?: FieldError;
  ibanStatus: IbanStatus;
  setIbanStatus: Dispatch<SetStateAction<IbanStatus>>;
  checkIban: (value: string) => Promise<boolean>;
};

const PayeeAccount = ({
  field,
  error,
  ibanStatus,
  setIbanStatus,
  checkIban,
}: PayeeAccountProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    field.onChange(e);
    setIbanStatus("idle");
  };

  const handleBlur = () => {
    field.onBlur();
    void checkIban(field.value ?? "");
  };

  return (
    <TextField
      {...field}
      label="Payee Account (IBAN)"
      value={field.value ?? ""}
      onChange={handleChange}
      onBlur={handleBlur}
      error={!!error}
      helperText={
        error?.message ??
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
  );
};

export default PayeeAccount;
