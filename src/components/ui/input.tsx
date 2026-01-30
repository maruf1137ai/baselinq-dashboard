import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex w-full rounded-[10px] border border-[#E6E8EB] bg-white text-sm text-black placeholder:text-[#1A1A1A80] placeholder:text-[15px]  py-[12px] px-[18px] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-normal file:text-foreground  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
