'use client';

import * as React from 'react';
import Image from 'next/image';
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

export function Header() {
  const { companyProfile } = useAppState();
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
          <DropdownMenuLabel>{isClient ? companyProfile.name : ''}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Pengaturan</DropdownMenuItem>
          <DropdownMenuItem>Dukungan</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Keluar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
