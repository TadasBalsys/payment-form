import { useState } from "react";
import type { FieldError } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PayeeAccount from "./PayeeAccount";
import type { IbanStatus } from "@/lib/validateIban";

function Harness({
  error,
  ibanStatus = "idle",
  checkIban = vi.fn().mockResolvedValue(true),
}: {
  error?: FieldError;
  ibanStatus?: IbanStatus;
  checkIban?: (value: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<IbanStatus>(ibanStatus);

  return (
    <PayeeAccount
      field={{
        name: "payeeAccount",
        value,
        onChange: (e) => setValue(e.target.value),
        onBlur: () => {},
        ref: () => {},
      }}
      error={error}
      ibanStatus={status}
      setIbanStatus={setStatus}
      checkIban={checkIban}
    />
  );
}

describe("PayeeAccount", () => {
  it("renders the IBAN field with its default helper text", () => {
    render(<Harness />);

    expect(
      screen.getByLabelText("Payee Account (IBAN)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "IBAN is checked against the validation service on blur.",
      ),
    ).toBeInTheDocument();
  });

  it("calls the validation service on blur with the current field value", async () => {
    const checkIban = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    render(<Harness checkIban={checkIban} />);

    await user.type(
      screen.getByLabelText("Payee Account (IBAN)"),
      "LT307300010172619160",
    );
    await user.tab();

    expect(checkIban).toHaveBeenCalledWith("LT307300010172619160");
  });

  it("resets the status back to idle when the field is edited", async () => {
    const user = userEvent.setup();
    render(<Harness ibanStatus="valid" />);

    await user.type(screen.getByLabelText("Payee Account (IBAN)"), "x");

    expect(
      screen.getByText(
        "IBAN is checked against the validation service on blur.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a spinner while a check is in progress", () => {
    render(<Harness ibanStatus="checking" />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows a verified message once the status is valid", () => {
    render(<Harness ibanStatus="valid" />);

    expect(screen.getByText("IBAN verified.")).toBeInTheDocument();
  });

  it("prefers the validation error message over the status helper text", () => {
    render(
      <Harness
        ibanStatus="invalid"
        error={{ type: "iban", message: "This IBAN could not be verified." }}
      />,
    );

    expect(
      screen.getByText("This IBAN could not be verified."),
    ).toBeInTheDocument();
  });
});
