'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, ReceiptText, LineChart, Package, Users, 
  FileText, Calculator, Settings, ListTree, Store, BriefcaseBusiness, Menu, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAppState } from '@/hooks/use-app-state';

export function BottomNav() {
  const pathname = usePathname();
  const { companyProfile } = useAppState();
  const [open, setOpen] = React.useState(false);

  // Menu Utama (Ikon yang selalu tampil di bar bawah)
  const mainNavItems = [
    { title: 'Dasbor', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Transaksi', href: '/transactions', icon: ReceiptText },
    { title: 'Laporan', href: '/reports', icon: LineChart },
    { title: 'Inventaris', href: '/inventory', icon: Package },
  ];

  // Menu Tambahan (Ditampilkan di laci "Lainnya" layaknya aplikasi Gojek/Tokopedia)
  const moreItems = [
    { title: 'Pelanggan', href: '/clients', icon: Users },
    { title: 'Pemasok', href: '/suppliers', icon: Store },
    { title: 'Karyawan', href: '/employees', icon: BriefcaseBusiness },
    { title: 'Tagihan', href: '/invoices', icon: FileText },
    { title: 'Perencana', href: '/business-planner', icon: Calculator },
    { title: 'Bagan Akun', href: '/accounts', icon: ListTree },
    { title: 'Pengaturan', href: '/settings', icon: Settings },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-between bg-background/95 backdrop-blur-xl border-t border-border/50 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 px-2 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full py-2 transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={24} className={cn("mb-1", isActive && "animate-pulse scale-110")} />
              <span className="text-[10px] font-medium leading-none">{item.title}</span>
            </Link>
          );
        })}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className="flex flex-col items-center justify-center w-full py-2 transition-colors duration-200 text-muted-foreground hover:text-foreground"
            >
              <Menu size={24} className="mb-1" />
              <span className="text-[10px] font-medium leading-none">Menu</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl md:hidden px-4 pt-6 pb-12 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
            <SheetHeader className="mb-6 text-left">
              <SheetTitle className="text-xl font-bold">Semua Menu</SheetTitle>
              <p className="text-sm text-muted-foreground">Eksplorasi seluruh fitur FinansiaProf</p>
            </SheetHeader>
            <div className="grid grid-cols-4 gap-y-8 gap-x-2 overflow-y-auto pb-8">
              {moreItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex flex-col items-center justify-start gap-2",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className={cn("p-4 rounded-2xl flex items-center justify-center transition-all", isActive ? "bg-primary/10 scale-105" : "bg-muted hover:bg-muted/80")}>
                      <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span className="text-[10px] text-center font-medium leading-tight">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
