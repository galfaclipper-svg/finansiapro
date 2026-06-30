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
    { title: 'Pengaturan', href: '/settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around bg-background/95 backdrop-blur-xl border-t border-border/50 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 px-2 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
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
