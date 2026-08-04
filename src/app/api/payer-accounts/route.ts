import { getPayerAccounts } from "@/mocks/payerAccounts";

export async function GET() {
  const payerAccounts = await getPayerAccounts();
  return Response.json(payerAccounts);
}
