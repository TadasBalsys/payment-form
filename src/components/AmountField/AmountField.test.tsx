import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AmountField from "./AmountField";
import type { AmountLocale } from "@/lib/utils/formatAmount";

function Harness({
  locale = "en",
  error,
}: {
  locale?: AmountLocale;
  error?: { type: string; message: string };
}) {
  const [value, setValue] = useState<unknown>("");

  return (
    <AmountField
      field={{
        name: "amount",
        value,
        onChange: (next: unknown) => setValue(next),
        onBlur: () => {},
        ref: () => {},
      }}
      error={error}
      locale={locale}
      trigger={vi.fn() as never}
    />
  );
}

/** Re-renders with a switchable locale so the EN/LT toggle can be simulated. */
function LocaleHarness() {
  const [locale, setLocale] = useState<AmountLocale>("en");
  const [value, setValue] = useState<unknown>("");

  return (
    <>
      <button onClick={() => setLocale(locale === "en" ? "lt" : "en")}>
        toggle
      </button>
      <AmountField
        field={{
          name: "amount",
          value,
          onChange: (next: unknown) => setValue(next),
          onBlur: () => {},
          ref: () => {},
        }}
        locale={locale}
        trigger={vi.fn() as never}
      />
    </>
  );
}

const amount = () => screen.getByLabelText("Amount") as HTMLInputElement;

describe("AmountField", () => {
  it("formats the typed amount in the field itself on blur (EN)", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(amount(), "1000");
    await user.tab();

    expect(amount().value).toBe("1,000.00");
  });

  it("formats the typed amount in the field itself on blur (LT)", async () => {
    const user = userEvent.setup();
    render(<Harness locale="lt" />);

    await user.type(amount(), "1000");
    await user.tab();

    // lt-LT groups with a non-breaking space (U+00A0), not a plain space.
    expect(amount().value).toBe("1 000,00");
  });

  it("pads decimals to two places", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(amount(), "1000.1");
    await user.tab();

    expect(amount().value).toBe("1,000.10");
  });

  it("refuses a third decimal digit (EN)", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(amount(), "10.555");
    expect(amount().value).toBe("10.55");

    await user.tab();
    expect(amount().value).toBe("10.55");
  });

  it("refuses a third decimal digit (LT)", async () => {
    const user = userEvent.setup();
    render(<Harness locale="lt" />);

    await user.type(amount(), "10,555");
    expect(amount().value).toBe("10,55");
  });

  it("still allows grouped thousands, which are not decimals", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(amount(), "1,000.10");
    await user.tab();

    expect(amount().value).toBe("1,000.10");
  });

  it("strips grouping again while the field is being edited", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(amount(), "1000.1");
    await user.tab();
    expect(amount().value).toBe("1,000.10");

    await user.click(amount());
    expect(amount().value).toBe("1000.10");
  });

  it("changes only the grouping when the field is focused again (LT)", async () => {
    const user = userEvent.setup();
    render(<Harness locale="lt" />);

    await user.type(amount(), "35212231,10");
    await user.tab();
    expect(amount().value).toBe("35 212 231,10");

    await user.click(amount());
    // The trailing zero used to disappear here: the value is the number
    // 35212231.1, and the edit form was not padding the cents back.
    expect(amount().value).toBe("35212231,10");
  });

  it("re-formats to the other locale when the language is switched", async () => {
    const user = userEvent.setup();
    render(<LocaleHarness />);

    await user.type(amount(), "1000.1");
    await user.tab();
    expect(amount().value).toBe("1,000.10");

    await user.click(screen.getByRole("button", { name: "toggle" }));

    expect(amount().value).toBe("1 000,10");
  });

  it("refuses letters and symbols outright", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(amount(), "abc");
    expect(amount().value).toBe("");

    await user.type(amount(), "12abc34");
    expect(amount().value).toBe("1234");
  });

  it("refuses the exponent notation a number input would have accepted", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(amount(), "1e5");
    expect(amount().value).toBe("15");
  });

  it("allows a leading minus so the schema can report it as too small", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    // Blocking the key outright would leave the user with a dead keyboard and
    // no explanation; "Amount must be at least 0.01." is the better feedback.
    await user.type(amount(), "-5");
    expect(amount().value).toBe("-5");
  });

  it("shows the validation error in place of the default helper text", () => {
    render(
      <Harness
        error={{ type: "min", message: "Amount must be at least 0.01." }}
      />,
    );

    expect(
      screen.getByText("Amount must be at least 0.01."),
    ).toBeInTheDocument();
  });

  it("uses a decimal-friendly text input rather than a number input", () => {
    render(<Harness />);

    // A number input silently rejects grouped values like "1,000.00" (the spec
    // only allows a bare floating-point number) and draws stepper arrows, so
    // the locale-formatted display requires type="text". inputmode still opens
    // the decimal keypad on phones.
    expect(amount()).toHaveAttribute("type", "text");
    expect(amount()).toHaveAttribute("inputmode", "decimal");
  });

  it("has no stepper arrows to increment with", () => {
    render(<Harness />);

    // Only type="number" renders them; a text input has none to hide.
    expect(amount()).not.toHaveAttribute("step");
    expect(amount().type).not.toBe("number");
  });
});
