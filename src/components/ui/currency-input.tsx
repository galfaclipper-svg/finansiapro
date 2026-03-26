
'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  onValueChange: (value: number | undefined) => void;
  value: number | undefined | null;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, onValueChange, value, ...props }, ref) => {
    
    const [displayValue, setDisplayValue] = React.useState<string>('');

    // Effect to format the value when it's changed programmatically (e.g., by react-hook-form)
    React.useEffect(() => {
        if (value !== undefined && value !== null) {
            const formatted = new Intl.NumberFormat('id-ID').format(value);
            // Only update if the display value is different to avoid cursor jumping issues
            if (numericStringToNumber(formatted) !== numericStringToNumber(displayValue)) {
                 setDisplayValue(formatted);
            }
        } else {
            setDisplayValue('');
        }
    }, [value]);

    const numericStringToNumber = (str: string) => {
        return parseInt(str.replace(/[^0-9]/g, ''), 10);
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value: inputValue } = event.target;
      
      // Remove all non-digit characters to get the raw number string
      const numericString = inputValue.replace(/[^0-9]/g, '');

      if (numericString === '') {
        onValueChange(undefined);
        setDisplayValue('');
      } else {
        const numberValue = parseInt(numericString, 10);
        onValueChange(numberValue);
        // Format for display and update the state, which re-renders the input
        setDisplayValue(new Intl.NumberFormat('id-ID').format(numberValue));
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        className={cn(className)}
        value={displayValue}
        onChange={handleChange}
        type="text" // Use text type to allow for formatted string with separators
        inputMode="numeric" // Provides a numeric keyboard on mobile devices
        placeholder={props.placeholder || '0'}
      />
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };

    