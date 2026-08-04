import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LanguageSwitcher from "./LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("renders both locale options with the current one selected", () => {
    render(<LanguageSwitcher locale="en" setLocale={vi.fn()} />);

    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "LT" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls setLocale with the newly selected locale", async () => {
    const setLocale = vi.fn();
    const user = userEvent.setup();
    render(<LanguageSwitcher locale="en" setLocale={setLocale} />);

    await user.click(screen.getByRole("button", { name: "LT" }));

    expect(setLocale).toHaveBeenCalledWith("lt");
  });

  it("does not call setLocale when clicking the already-selected locale", async () => {
    const setLocale = vi.fn();
    const user = userEvent.setup();
    render(<LanguageSwitcher locale="en" setLocale={setLocale} />);

    await user.click(screen.getByRole("button", { name: "EN" }));

    expect(setLocale).not.toHaveBeenCalled();
  });
});
