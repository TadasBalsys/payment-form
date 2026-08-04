export type PayerAccount = {
  iban: string;
  id: string;
  balance: number;
};

const payerAccounts: PayerAccount[] = [
  {
    iban: "LT307300010172619160",
    id: "1",
    balance: 1000.12,
  },
  {
    iban: "LT307300010172619161",
    id: "2",
    balance: 2.43,
  },
  {
    iban: "LT307300010172619162",
    id: "3",
    balance: -5.87,
  },
];

const MOCK_NETWORK_DELAY_MS = 300;

export async function getPayerAccounts(): Promise<PayerAccount[]> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_NETWORK_DELAY_MS));
  return payerAccounts;
}
