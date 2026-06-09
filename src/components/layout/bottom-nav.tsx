'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ReceiptText, LineChart, Package, Users, FileText, Calculator, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { title: 'Dasbor', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Transaksi', href: '/transactions', icon: ReceiptText },
    { title: 'Laporan', href: '/reports', icon: LineChart },
    { title: 'Tagihan', href: '/invoices', icon: FileText },
    { title: 'Pengaturan', href: '/settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-background/80 backdrop-blur-xl border-t border-border/50 pb-safe pt-2 px-2 md:hidden">
      {navItems.map((item) => {
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
            <Icon size={24} className={cn("mb-1", isActive && "animate-pulse")} />
            <span className="text-[10px] font-medium leading-none">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
