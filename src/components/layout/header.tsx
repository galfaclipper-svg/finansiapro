'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useAppState } from '@/hooks/use-app-state';
import { useAuth } from '@/contexts/auth-provider';

export function Header() {
  const { companyProfile } = useAppState();
  const { user, logout } = useAuth();
  const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar');
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:pb-4">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1" />
      <LanguageSwitcher />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full"
          >
            {isClient && companyProfile.logoUrl ? (
                <Image
                    src={companyProfile.logoUrl}
                    width={40}
                    height={40}
                    alt={companyProfile.name}
                    className="overflow-hidden rounded-full object-contain"
                />
            ) : userAvatar && (
              <Image
                src={userAvatar.imageUrl}
                width={40}
                height={40}
                alt="User Avatar"
                data-ai-hint={userAvatar.imageHint}
                className="overflow-hidden rounded-full"
              />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="flex flex-col space-y-1">
            <span className="text-sm font-medium leading-none">{isClient ? companyProfile.name : ''}</span>
            <span className="text-xs leading-none text-muted-foreground">{user?.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/settings">Pengaturan</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <a href="mailto:wisesaniskala@gmail.com?subject=Dukungan%20FinansiaPro">Dukungan</a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-red-600 focus:text-red-600">Keluar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
