export type PayerAccount = {
  iban: string;
  id: string;
  balance: number;
};

export const payerAccounts: PayerAccount[] = [
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
