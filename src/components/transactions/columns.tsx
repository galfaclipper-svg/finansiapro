"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Transaction } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ArrowDown, ArrowUp, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

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
        return <div>{format(date, "d LLL y", { locale: id })}</div>
    }
  },
    {
    accessorKey: "type",
    header: "Tipe",
    cell: ({ row }) => {
        const type = row.getValue("type") as string;
        const variant = type === 'cash-in' ? 'default' : 'secondary';
        return <Badge variant={variant} className={type === 'cash-in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{type === 'cash-in' ? 'Uang Masuk' : 'Uang Keluar'}</Badge>
    }
  },
  {
    accessorKey: "category",
    header: "Kategori",
    cell: ({ row }) => <Badge variant="outline">{row.getValue("category")}</Badge>
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
    cell: ({ row }) => {
      const transaction = row.original
 
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
            <DropdownMenuItem>Ubah transaksi</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Hapus transaksi</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
