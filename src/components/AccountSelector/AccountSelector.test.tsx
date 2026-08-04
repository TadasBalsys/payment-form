import { useState } from "react";
import type { FieldError } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountSelector from "./AccountSelector";
import type { PayerAccount } from "@/mocks/payerAccounts";
import type { PaymentFormInput } from "@/lib/paymentSchema";

const payerAccounts: PayerAccount[] = [
  { id: "1", iban: "LT307300010172619160", balance: 1000.12 },
  { id: "2", iban: "LT307300010172619161", balance: 2.43 },
  { id: "3", iban: "LT307300010172619162", balance: -5.87 },
];

function Harness({
  amountValue = "",
  error,
  trigger = vi.fn(),
}: {
  amountValue?: PaymentFormInput["amount"];
  error?: FieldError;
  trigger?: (names: unknown) => void;
}) {
  const [value, setValue] = useState("");
  const selectedAccount = payerAccounts.find((a) => a.id === value);

  return (
    <AccountSelector
      field={{
        name: "payerAccountId",
        value,
        onChange: (e) => setValue(e.target.value),
        onBlur: () => {},
        ref: () => {},
      }}
      amountValue={amountValue}
      trigger={trigger as never}
      payerAccounts={payerAccounts}
      error={error}
      selectedAccount={selectedAccount}
      locale="en"
    />
  );
}

async function openAndSelect(
  user: ReturnType<typeof userEvent.setup>,
  iban: string,
) {
  await user.click(screen.getByRole("combobox", { name: "Payer Account" }));
  await user.click(await screen.findByRole("option", { name: new RegExp(iban) }));
}

describe("AccountSelector", () => {
  it("lists every payer account with its formatted balance", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("combobox", { name: "Payer Account" }));

    expect(
      await screen.findByRole("option", { name: /LT307300010172619160/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /LT307300010172619161/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /LT307300010172619162/ }),
    ).toBeInTheDocument();
  });

  it("shows the selected account's balance once chosen", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await openAndSelect(user, "LT307300010172619160");

    expect(screen.getByText(/Balance: 1,000.12\s*EUR/)).toBeInTheDocument();
  });

  it("prefers the validation error message over the balance helper text", () => {
    render(
      <Harness
        error={{ type: "required", message: "Please select a payer account." }}
      />,
    );

    expect(
      screen.getByText("Please select a payer account."),
    ).toBeInTheDocument();
  });

  it("re-triggers amount validation when the account changes and an amount is already entered", async () => {
    const trigger = vi.fn();
    const user = userEvent.setup();
    render(<Harness amountValue={10} trigger={trigger} />);

    await openAndSelect(user, "LT307300010172619160");

    expect(trigger).toHaveBeenCalledWith(["amount", "payerAccountId"]);
  });

  it("does not trigger amount validation when no amount has been entered", async () => {
    const trigger = vi.fn();
    const user = userEvent.setup();
    render(<Harness trigger={trigger} />);

    await openAndSelect(user, "LT307300010172619160");

    expect(trigger).not.toHaveBeenCalled();
  });
});
