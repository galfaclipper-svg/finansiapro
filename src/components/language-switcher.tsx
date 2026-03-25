'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Ganti bahasa</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          Indonesia
        </DropdownMenuItem>
        <DropdownMenuItem>
          English
        </DropdownMenuItem>
        <DropdownMenuItem>
          Arabic
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
