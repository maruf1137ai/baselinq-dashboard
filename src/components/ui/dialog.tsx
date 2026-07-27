import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// One radius, one shadow, one border, one surface — for every dialog.
//
// ~60 call sites had drifted to ~40 distinct className combinations: 15
// widths, 4 radii (including a rounded-3xl that read as a different
// product), 4 shadows and 4 border declarations, all hand-copied from each
// other. The chrome is now decided here and the call sites only choose a
// size. rounded-xl (8px) is the card/panel radius on this branch; shadow-lg
// is the same elevation the popover and dropdown use, so a menu opened over
// a dialog belongs to the same surface family.
const dialogContentVariants = cva(
  'fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border border-border bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
  {
    variants: {
      // Five steps, replacing 420/425/500/550/560/600/650/680/682/720px and
      // the md/lg/xl/2xl/3xl/4xl/6xl/95vw Tailwind widths. Each old width was
      // mapped to its nearest step rather than preserved verbatim — a 30px
      // difference between two dialogs was never a design decision.
      size: {
        // Confirmations and single-field forms.
        sm: 'max-w-[420px]',
        // The common case: a short form, a detail panel.
        md: 'max-w-[560px]',
        // Multi-section forms.
        lg: 'max-w-[680px]',
        // Data-heavy content: tables, previews, side-by-side layouts.
        xl: 'max-w-[880px]',
        // The genuine viewer cases that were reaching for 95vw / 6xl.
        full: 'w-[95vw] max-w-[1200px]',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  /**
   * Suppress the built-in top-right close (X) button. Use when the caller
   * renders its own close control in a custom header. Defaults to showing it.
   */
  hideClose?: boolean;
}

const DialogContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className, children, size, hideClose = false, 'aria-describedby': ariaDescribedBy = undefined, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        aria-describedby={ariaDescribedBy}
        className={cn(dialogContentVariants({ size }), className)}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg p-2 opacity-70 ring-offset-background transition hover:bg-muted hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  // Left-aligned at every breakpoint. The centred-on-mobile default meant a
  // dialog title changed alignment mid-resize while nothing else on the page
  // did.
  <div className={cn('flex flex-col space-y-1.5 text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  // gap-2 rather than space-x-2: the row reverses on mobile, and space-x-*
  // applies its margin to the wrong edge once the axis flips.
  <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end', className)} {...props} />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  // One title role for every modal surface. Sheet, AlertDialog and Dialog all
  // declare this same pair, so a drawer heading and a dialog heading no longer
  // land at different sizes or weights.
  <DialogPrimitive.Title ref={ref} className={cn('text-base font-medium text-foreground', className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  dialogContentVariants,
};
