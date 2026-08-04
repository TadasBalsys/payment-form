import { NextRequest } from "next/server";

const IBAN_VALIDATION_ENDPOINT =
  process.env.IBAN_VALIDATION_ENDPOINT ?? "https://matavi.eu/validate/";

type UpstreamIbanValidationResponse = {
  iban: string;
  valid: boolean;
};

export async function GET(request: NextRequest) {
  const iban = request.nextUrl.searchParams.get("iban");

  if (!iban) {
    return Response.json(
      { error: "Missing iban parameter." },
      { status: 400 },
    );
  }

  let response: Response;

  try {
    response = await fetch(
      `${IBAN_VALIDATION_ENDPOINT}?iban=${encodeURIComponent(iban)}`,
    );
  } catch {
    return Response.json(
      { error: "Could not reach the IBAN validation service." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return Response.json(
      { error: "Could not verify IBAN, please try again." },
      { status: 502 },
    );
  }

  const data = (await response.json()) as UpstreamIbanValidationResponse;

  return Response.json({ iban: data.iban, valid: data.valid });
}
