import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentForm from "@/components/PaymentForm/PaymentForm";
import type { PayerAccount } from "@/mocks/payerAccounts";
import { IbanValidationError, validateIban } from "@/lib/utils/validateIban";

vi.mock("@/lib/utils/validateIban", () => ({
  validateIban: vi.fn(),
  IbanValidationError: class IbanValidationError extends Error {},
}));

const payerAccounts: PayerAccount[] = [
  { id: "1", iban: "LT307300010172619160", balance: 1000.12 },
  { id: "2", iban: "LT307300010172619161", balance: 2.43 },
  { id: "3", iban: "LT307300010172619162", balance: -5.87 },
];

const VALID_PAYEE_IBAN = "LT307300010172619199";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function selectPayerAccount(
  user: ReturnType<typeof userEvent.setup>,
  iban: string,
) {
  await user.click(screen.getByRole("combobox", { name: "Payer Account" }));
  await user.click(await screen.findByRole("option", { name: new RegExp(iban) }));
}

beforeEach(() => {
  vi.mocked(validateIban).mockReset();
});

describe("PaymentForm", () => {
  it("renders all fields and lists payer accounts", async () => {
    const user = userEvent.setup();
    render(<PaymentForm payerAccounts={payerAccounts} />);

    expect(
      screen.getByRole("combobox", { name: "Payer Account" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Payee Account (IBAN)")).toBeInTheDocument();
    expect(screen.getByLabelText("Payee")).toBeInTheDocument();
    expect(screen.getByLabelText("Purpose")).toBeInTheDocument();

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

  it("shows the selected account's balance", async () => {
    const user = userEvent.setup();
    render(<PaymentForm payerAccounts={payerAccounts} />);

    await selectPayerAccount(user, "LT307300010172619160");

    expect(screen.getByText(/Balance: 1,000.12\s*EUR/)).toBeInTheDocument();
  });

  it("flags an amount that exceeds the selected account's balance, and reformats the message when the locale changes", async () => {
    const user = userEvent.setup();
    render(<PaymentForm payerAccounts={payerAccounts} />);

    await selectPayerAccount(user, "LT307300010172619160");
    await user.type(screen.getByLabelText("Amount"), "1500");
    await user.tab();

    expect(
      await screen.findByText("Amount exceeds available balance (1,000.12)."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "LT" }));

    // The locale figure uses a non-breaking-space grouping separator (see
    // formatAmount.test.ts), so match loosely on the digits rather than the
    // exact separator character; timeout raised since this re-validation
    // crosses an extra async boundary (the locale-change effect + resolver).
    expect(
      await screen.findByText(
        (text) =>
          text.startsWith("Amount exceeds available balance") &&
          text.includes("000,12"),
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
  });

  it("re-validates the amount against the newly selected account's balance", async () => {
    const user = userEvent.setup();
    render(<PaymentForm payerAccounts={payerAccounts} />);

    await selectPayerAccount(user, "LT307300010172619161"); // balance 2.43
    await user.type(screen.getByLabelText("Amount"), "10");
    await user.tab();

    expect(
      await screen.findByText(/Amount exceeds available balance/),
    ).toBeInTheDocument();

    await selectPayerAccount(user, "LT307300010172619160"); // balance 1000.12

    await waitFor(() => {
      expect(
        screen.queryByText(/Amount exceeds available balance/),
      ).not.toBeInTheDocument();
    });
  });

  describe("IBAN verification", () => {
    it("shows a format error on blur without calling the validation service", async () => {
      const user = userEvent.setup();
      render(<PaymentForm payerAccounts={payerAccounts} />);

      await user.type(
        screen.getByLabelText("Payee Account (IBAN)"),
        "not-an-iban",
      );
      await user.tab();

      expect(await screen.findByText(/Enter a valid IBAN/)).toBeInTheDocument();
      expect(validateIban).not.toHaveBeenCalled();
    });

    it("shows a spinner while checking, then verifies a valid IBAN", async () => {
      const { promise, resolve } = deferred<boolean>();
      vi.mocked(validateIban).mockReturnValueOnce(promise);

      const user = userEvent.setup();
      render(<PaymentForm payerAccounts={payerAccounts} />);

      await user.type(
        screen.getByLabelText("Payee Account (IBAN)"),
        VALID_PAYEE_IBAN,
      );
      await user.tab();

      expect(await screen.findByRole("progressbar")).toBeInTheDocument();

      resolve(true);

      expect(await screen.findByText("IBAN verified.")).toBeInTheDocument();
    });

    it("shows a not-verified message when the service reports the IBAN invalid", async () => {
      const { promise, resolve } = deferred<boolean>();
      vi.mocked(validateIban).mockReturnValueOnce(promise);

      const user = userEvent.setup();
      render(<PaymentForm payerAccounts={payerAccounts} />);

      await user.type(
        screen.getByLabelText("Payee Account (IBAN)"),
        VALID_PAYEE_IBAN,
      );
      await user.tab();

      // Wait for the pending check to be reflected in the UI before resolving,
      // so this settles after react-hook-form's own onBlur validation —
      // matching real usage, where the network call always outlasts local
      // schema validation. Resolving instantly would race the two and could
      // let RHF's own (unrelated) revalidation clobber the manual setError.
      await screen.findByRole("progressbar");
      resolve(false);

      expect(
        await screen.findByText("This IBAN could not be verified."),
      ).toBeInTheDocument();
    });

    it("shows a service error message when validation throws", async () => {
      const { promise, reject } = deferred<boolean>();
      vi.mocked(validateIban).mockReturnValueOnce(promise);

      const user = userEvent.setup();
      render(<PaymentForm payerAccounts={payerAccounts} />);

      await user.type(
        screen.getByLabelText("Payee Account (IBAN)"),
        VALID_PAYEE_IBAN,
      );
      await user.tab();

      await screen.findByRole("progressbar");
      reject(new IbanValidationError("Could not verify IBAN."));

      expect(
        await screen.findByText("Could not verify IBAN."),
      ).toBeInTheDocument();
    });

    it("ignores a stale response from an earlier check once a newer check has started", async () => {
      const first = deferred<boolean>();
      const second = deferred<boolean>();
      vi.mocked(validateIban)
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);

      const user = userEvent.setup();
      render(<PaymentForm payerAccounts={payerAccounts} />);

      const ibanInput = screen.getByLabelText("Payee Account (IBAN)");

      await user.type(ibanInput, VALID_PAYEE_IBAN);
      await user.tab();
      await waitFor(() => expect(validateIban).toHaveBeenCalledTimes(1));

      await user.click(ibanInput);
      await user.clear(ibanInput);
      await user.type(ibanInput, VALID_PAYEE_IBAN.slice(0, -1) + "8");
      await user.tab();
      await waitFor(() => expect(validateIban).toHaveBeenCalledTimes(2));

      second.resolve(true);
      expect(await screen.findByText("IBAN verified.")).toBeInTheDocument();

      first.resolve(false);
      await waitFor(() => {
        expect(screen.getByText("IBAN verified.")).toBeInTheDocument();
      });
    });
  });

  it("caps payee and purpose at their character limits", () => {
    render(<PaymentForm payerAccounts={payerAccounts} />);

    expect(screen.getByLabelText("Payee")).toHaveAttribute("maxLength", "70");
    expect(screen.getByLabelText("Purpose")).toHaveAttribute(
      "maxLength",
      "135",
    );
  });

  describe("submit", () => {
    async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
      await selectPayerAccount(user, "LT307300010172619160");
      await user.type(screen.getByLabelText("Amount"), "10");
      await user.type(screen.getByLabelText("Payee"), "Jane Doe");
      await user.type(screen.getByLabelText("Purpose"), "Invoice payment");
    }

    it("submits immediately without re-checking an already-verified IBAN", async () => {
      vi.mocked(validateIban).mockResolvedValueOnce(true);

      const user = userEvent.setup();
      render(<PaymentForm payerAccounts={payerAccounts} />);

      await fillValidForm(user);
      await user.type(
        screen.getByLabelText("Payee Account (IBAN)"),
        VALID_PAYEE_IBAN,
      );
      await user.tab();
      expect(await screen.findByText("IBAN verified.")).toBeInTheDocument();
      expect(validateIban).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole("button", { name: /submit payment/i }));

      expect(
        await screen.findByText(/Payment of 10.00 EUR to Jane Doe submitted\./),
      ).toBeInTheDocument();
      expect(validateIban).toHaveBeenCalledTimes(1);
    });

    it("checks the IBAN during submit if it was never verified on blur", async () => {
      vi.mocked(validateIban).mockResolvedValueOnce(true);

      const user = userEvent.setup();
      render(<PaymentForm payerAccounts={payerAccounts} />);

      await fillValidForm(user);
      // Set the IBAN value directly, bypassing focus/blur, so the field's
      // own onBlur check never runs and ibanStatus stays "idle" going into submit.
      fireEvent.change(screen.getByLabelText("Payee Account (IBAN)"), {
        target: { value: VALID_PAYEE_IBAN },
      });

      await user.click(screen.getByRole("button", { name: /submit payment/i }));

      await waitFor(() => expect(validateIban).toHaveBeenCalledTimes(1));
      expect(
        await screen.findByText(/Payment of 10.00 EUR to Jane Doe submitted\./),
      ).toBeInTheDocument();
    });

    it("disables the submit button while an IBAN check is in progress", async () => {
      const { promise } = deferred<boolean>();
      vi.mocked(validateIban).mockReturnValueOnce(promise);

      const user = userEvent.setup();
      render(<PaymentForm payerAccounts={payerAccounts} />);

      await user.type(
        screen.getByLabelText("Payee Account (IBAN)"),
        VALID_PAYEE_IBAN,
      );
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /submit payment/i }),
        ).toBeDisabled();
      });
    });

    it("blocks submission and surfaces validation errors when required fields are missing", async () => {
      const user = userEvent.setup();
      render(<PaymentForm payerAccounts={payerAccounts} />);

      await user.click(screen.getByRole("button", { name: /submit payment/i }));

      expect(
        await screen.findByText("Please select a payer account."),
      ).toBeInTheDocument();
      expect(validateIban).not.toHaveBeenCalled();
    });
  });
});
