"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Transaction } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ArrowDown, ArrowUp, MoreHorizontal, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from 'date-fns';
import { id as dateFnsId } from 'date-fns/locale';
import { useAppState } from "@/hooks/use-app-state"
import { useRouter } from "next/navigation"

export const columns: ColumnDef<Transaction>[] = [
    {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Pilih semua"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Pilih baris"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "description",
    header: "Deskripsi",
  },
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Tanggal
          {column.getIsSorted() === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />}
        </Button>
      )
    },
    cell: ({ row }) => {
        const date = new Date(row.getValue("date"))
        return <div>{format(date, "d LLL y", { locale: dateFnsId })}</div>
    }
  },
    {
    accessorKey: "type",
    header: "Tipe",
    cell: ({ row }) => {
        const type = row.getValue("type") as string;
        let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
        let label = 'Uang Keluar';
        let className = 'bg-red-100 text-red-800';

        if (type === 'cash-in') {
           variant = 'default';
           label = 'Uang Masuk';
           className = 'bg-green-100 text-green-800 border-transparent';
        } else if (type === 'transfer') {
           variant = 'outline';
           label = 'Mutasi Kas';
           className = 'bg-blue-100 text-blue-800 border-blue-200';
        }

        return <Badge variant={variant} className={className}>{label}</Badge>
    }
  },
  {
    accessorKey: "category",
    header: "Kategori / Rute Kas",
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      const t = row.original;
      if (type === 'transfer') {
         return (
           <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap">
             <span className="font-medium text-foreground">{t.accountId || 'Kas Bank BCA'}</span> 
             <ArrowRight className="mx-1 h-3 w-3" /> 
             <span className="font-medium text-foreground">{t.toAccountId}</span>
           </div>
         );
      }
      return <Badge variant="outline" className="whitespace-nowrap">{row.getValue("category")}</Badge>
    }
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Jumlah</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      return <div className="text-right font-medium">{formatCurrency(amount)}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionCell transaction={row.original} />
  },
]

const ActionCell = ({ transaction }: { transaction: Transaction }) => {
  const { deleteTransaction } = useAppState();
  const router = useRouter();

  const handleDelete = async () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
      await deleteTransaction(transaction.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Buka menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(transaction.id)}
        >
          Salin ID transaksi
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/transactions/edit/${transaction.id}`)}>Ubah transaksi</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={handleDelete}>Hapus transaksi</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
