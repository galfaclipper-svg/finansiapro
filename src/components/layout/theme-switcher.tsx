'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
        <Button variant="ghost" size="icon" className="h-8 w-8 px-0 text-muted-foreground">
          <Palette className="h-4 w-4" />
        </Button>
    );
  }

  const themes = [
    { id: 'light', label: 'Terang & Kontras' },
    { id: 'dark', label: 'Gelap & Kontras' },
    { id: 'burgundy', label: 'Burgundy Premium' },
    { id: 'luxury', label: 'Luxury Gold' },
    { id: 'terracotta', label: 'Earthy Terracotta' },
    { id: 'stencil', label: 'Industrial Stencil' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 px-0 text-muted-foreground relative">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Pilih Tema</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.id}
            className={`cursor-pointer ${theme === t.id ? 'bg-accent text-accent-foreground font-semibold' : ''}`}
            onClick={() => setTheme(t.id)}
          >
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
