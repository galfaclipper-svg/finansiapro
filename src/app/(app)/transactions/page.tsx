'use client';

import { PageHeader } from '@/components/layout/page-header';
import { columns } from '@/components/transactions/columns';
import { DataTable } from '@/components/transactions/data-table';
import { useAppState } from '@/hooks/use-app-state';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function TransactionsPage() {
  const { transactions } = useAppState();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Transaksi"
        description="Kelola dan tinjau semua transaksi bisnis Anda."
      >
        <Button asChild>
          <Link href="/transactions/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Transaksi Baru
          </Link>
        </Button>
      </PageHeader>

      <DataTable columns={columns} data={transactions} />
    </div>
  );
}
