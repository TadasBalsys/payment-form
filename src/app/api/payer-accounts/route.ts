import { payerAccounts } from "@/mocks/payerAccounts";

const MOCK_NETWORK_DELAY_MS = 300;

// mocking a network delay to simulate a real API call
export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, MOCK_NETWORK_DELAY_MS));
  return Response.json(payerAccounts);
}
