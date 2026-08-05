import { afterEach, describe, expect, it, vi } from "vitest";
import type { PayerAccount } from "@/mocks/payerAccounts";
import { getPayerAccounts } from "@/mocks/payerAccounts";
import { GET } from "./route";

vi.mock("@/mocks/payerAccounts", () => ({
  getPayerAccounts: vi.fn(),
}));

const accounts: PayerAccount[] = [
  { iban: "LT307300010172619160", id: "1", balance: 1000.12 },
  { iban: "LT307300010172619161", id: "2", balance: 2.43 },
  { iban: "LT307300010172619162", id: "3", balance: -5.87 },
];

describe("GET /api/payer-accounts", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns the payer accounts as JSON", async () => {
    vi.mocked(getPayerAccounts).mockResolvedValueOnce(accounts);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body).toEqual(accounts);
  });

  it("reads the accounts from the data source once per request", async () => {
    vi.mocked(getPayerAccounts).mockResolvedValue(accounts);

    await GET();

    expect(getPayerAccounts).toHaveBeenCalledTimes(1);
    expect(getPayerAccounts).toHaveBeenCalledWith();
  });

  it("returns an empty array when there are no accounts", async () => {
    vi.mocked(getPayerAccounts).mockResolvedValueOnce([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("preserves negative and fractional balances in the response body", async () => {
    vi.mocked(getPayerAccounts).mockResolvedValueOnce([
      { iban: "LT307300010172619162", id: "3", balance: -5.87 },
    ]);

    const response = await GET();
    const [account] = (await response.json()) as PayerAccount[];

    expect(account.balance).toBe(-5.87);
  });

  it("rejects when the data source fails", async () => {
    vi.mocked(getPayerAccounts).mockRejectedValueOnce(
      new Error("data source unavailable"),
    );

    await expect(GET()).rejects.toThrow("data source unavailable");
  });
});
