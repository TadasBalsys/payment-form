const IBAN_VALIDATION_ENDPOINT =
  process.env.NEXT_PUBLIC_IBAN_VALIDATION_ENDPOINT;

type IbanValidationResponse = {
  iban: string;
  valid: boolean;
};

export class IbanValidationError extends Error {}

export async function validateIban(
  iban: string,
  signal?: AbortSignal,
): Promise<boolean> {
  let response: Response;

  try {
    response = await fetch(
      `${IBAN_VALIDATION_ENDPOINT}?iban=${encodeURIComponent(iban)}`,
      { signal },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new IbanValidationError(
      "Could not reach the IBAN validation service.",
    );
  }

  if (!response.ok) {
    throw new IbanValidationError("Could not verify IBAN, please try again.");
  }

  const data = (await response.json()) as IbanValidationResponse;

  return data.valid;
}
