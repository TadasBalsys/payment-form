import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IbanValidationError, validateIban } from "./validateIban";

describe("validateIban", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves true when the service reports the IBAN as valid", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ iban: "LT307300010172619160", valid: true }), {
        status: 200,
      }),
    );

    await expect(validateIban("LT307300010172619160")).resolves.toBe(true);
  });

  it("resolves false when the service reports the IBAN as invalid", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ iban: "LT307300010172619160", valid: false }), {
        status: 200,
      }),
    );

    await expect(validateIban("LT307300010172619160")).resolves.toBe(false);
  });

  it("throws IbanValidationError on a non-OK HTTP status", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));

    await expect(validateIban("LT307300010172619160")).rejects.toBeInstanceOf(
      IbanValidationError,
    );
  });

  it("throws IbanValidationError when the network request fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("network error"));

    await expect(validateIban("LT307300010172619160")).rejects.toBeInstanceOf(
      IbanValidationError,
    );
  });

  it("rethrows an AbortError without wrapping it", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    vi.mocked(fetch).mockRejectedValueOnce(abortError);

    await expect(validateIban("LT307300010172619160")).rejects.toBe(abortError);
  });

  it("builds the request URL with an encoded IBAN", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ iban: "LT30 X", valid: true }), { status: 200 }),
    );

    await validateIban("LT30 X");

    expect(fetch).toHaveBeenCalledWith(
      `/api/validate-iban?iban=${encodeURIComponent("LT30 X")}`,
      expect.anything(),
    );
  });
});
