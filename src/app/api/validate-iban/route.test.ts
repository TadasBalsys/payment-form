import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function requestFor(iban?: string) {
  const url = new URL("http://localhost/api/validate-iban");
  if (iban !== undefined) url.searchParams.set("iban", iban);
  return new NextRequest(url);
}

describe("GET /api/validate-iban", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 400 when the iban parameter is missing", async () => {
    const response = await GET(requestFor());

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("proxies a valid IBAN and returns the upstream result", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ iban: "LT307300010172619160", valid: true }),
        { status: 200 },
      ),
    );

    const response = await GET(requestFor("LT307300010172619160"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ iban: "LT307300010172619160", valid: true });
    expect(fetch).toHaveBeenCalledWith(
      "https://iban-validate.test/api?iban=LT307300010172619160",
    );
  });

  it("proxies an invalid IBAN and returns the upstream result", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ iban: "LT000000000000000000", valid: false }),
        { status: 200 },
      ),
    );

    const response = await GET(requestFor("LT000000000000000000"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ iban: "LT000000000000000000", valid: false });
  });

  it("returns 502 when the upstream service responds with a non-OK status", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));

    const response = await GET(requestFor("LT307300010172619160"));

    expect(response.status).toBe(502);
  });

  it("returns 502 when the upstream request fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("network error"));

    const response = await GET(requestFor("LT307300010172619160"));

    expect(response.status).toBe(502);
  });

  it("URL-encodes the iban query parameter sent upstream", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ iban: "LT30 X", valid: true }), {
        status: 200,
      }),
    );

    await GET(requestFor("LT30 X"));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`iban=${encodeURIComponent("LT30 X")}`),
    );
  });
});
