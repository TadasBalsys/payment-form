import PaymentForm from "@/components/PaymentForm/PaymentForm";
import { getPayerAccounts } from "@/mocks/payerAccounts";

export default async function Home() {
  const payerAccounts = await getPayerAccounts();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 py-16 px-4">
      <PaymentForm payerAccounts={payerAccounts} />
    </div>
  );
}
