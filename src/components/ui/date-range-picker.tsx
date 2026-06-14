'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAppState } from '@/hooks/use-app-state';

export function DatePickerWithRange({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const { dateRange: date, setDateRange: setDate } = useAppState();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {isClient && date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'd LLL y', { locale: id })} -{' '}
                  {format(date.to, 'd LLL y', { locale: id })}
                </>
              ) : (
                format(date.from, 'd LLL y', { locale: id })
              )
            ) : (
              <span>Pilih rentang tanggal</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 force-light bg-white text-slate-900 border-slate-200" align="end">
          <div className="flex flex-col sm:flex-row p-3 gap-4 border-b border-slate-200">
             <div className="grid gap-1.5 flex-1">
                 <label className="text-xs font-semibold text-slate-600 uppercase">Dari Tanggal</label>
                 <input 
                    type="date" 
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                    value={date?.from ? format(date.from, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        if (!isNaN(newDate.getTime())) {
                            setDate({ ...date, from: newDate, to: date?.to && newDate > date.to ? newDate : date?.to });
                        }
                    }}
                 />
             </div>
             <div className="grid gap-1.5 flex-1">
                 <label className="text-xs font-semibold text-slate-600 uppercase">Sampai Tanggal</label>
                 <input 
                    type="date" 
                    className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                    value={date?.to ? format(date.to, 'yyyy-MM-dd') : ''}
                    min={date?.from ? format(date.from, 'yyyy-MM-dd') : undefined}
                    onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        if (!isNaN(newDate.getTime())) {
                            setDate({ ...date, from: date?.from || newDate, to: newDate });
                        }
                    }}
                 />
             </div>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 2}
            locale={id}
            captionLayout="dropdown-buttons"
            fromYear={2020}
            toYear={new Date().getFullYear() + 5}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
