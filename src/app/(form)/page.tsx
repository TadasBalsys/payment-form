"use client";

import { useEffect, useState } from "react";
import { CircularProgress } from "@mui/material";
import PaymentForm from "@/components/PaymentForm";
import type { PayerAccount } from "@/mocks/payerAccounts";

export default function Home() {
  const [payerAccounts, setPayerAccounts] = useState<PayerAccount[] | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    fetch("/api/payer-accounts")
      .then((res) => res.json())
      .then((accounts: PayerAccount[]) => {
        if (active) {
          setPayerAccounts(accounts);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 py-16 px-4">
      {payerAccounts ? (
        <PaymentForm payerAccounts={payerAccounts} />
      ) : (
        <CircularProgress aria-label="Loading payment form" />
      )}
    </div>
  );
}
