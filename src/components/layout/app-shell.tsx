'use client';

import * as React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/logo';
import { useAppState } from '@/hooks/use-app-state';
import { SidebarNav } from './sidebar-nav';
import { Header } from './header';
import Link from 'next/link';
import { LayoutDashboard, ReceiptText, Package, LineChart, Settings } from 'lucide-react';
import type { NavItem } from '@/lib/types';

const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dasbor',
    href: '/dashboard',
    icon: <LayoutDashboard size={20} />,
  },
  {
    title: 'Transaksi',
    href: '/transactions',
    icon: <ReceiptText size={20} />,
  },
  {
    title: 'Laporan',
    href: '/reports',
    icon: <LineChart size={20} />,
  },
  {
    title: 'Inventaris',
    href: '/inventory',
    icon: <Package size={20} />,
  },
  {
    title: 'Pengaturan',
    href: '/settings',
    icon: <Settings size={20} />,
  },
];


export function AppShell({ children }: { children: React.ReactNode }) {
  const { companyProfile } = useAppState();

  // The `open` state is initialized from a cookie, which is only available on the client.
  // To prevent a hydration mismatch, we initialize the state to `true` (matching the server)
  // and then update it on the client in a `useEffect` hook.
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    // document.cookie is a client-side API.
    // We check if the cookie exists to decide whether to use its value or the default.
    if (document.cookie.includes('sidebar_state=')) {
      setOpen(document.cookie.includes('sidebar_state=true'));
    }
  }, []);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="border-sidebar-border"
      >
        <SidebarHeader className="h-14 p-3.5 flex items-center gap-2">
          <Link className="flex items-center gap-2" href="/dashboard">
            <Logo className="w-7 h-7 text-primary shrink-0" />
            <span className="font-bold text-lg text-primary truncate">
              FinansiaPro
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav items={NAV_ITEMS} />
        </SidebarContent>
        <SidebarFooter>
            <SidebarSeparator/>
             <div className="p-4 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                <p>&copy; {new Date().getFullYear()} {companyProfile.name}</p>
             </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col">
          <Header />
          <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
