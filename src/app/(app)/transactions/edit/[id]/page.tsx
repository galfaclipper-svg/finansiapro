import EditTransactionPage from "@/components/transactions/edit-transaction-page";

export default async function EditTransactionRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditTransactionPage transactionId={id} />;
}
