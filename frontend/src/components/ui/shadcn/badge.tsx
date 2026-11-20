import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow-xs',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-red-500/40 bg-red-500/15 text-red-400',
        success:
          'border-emerald-500/40 bg-emerald-500/15 text-emerald-400',
        warning:
          'border-amber-500/40 bg-amber-500/15 text-amber-400',
        info:
          'border-blue-500/40 bg-blue-500/15 text-blue-400',
        outline: 'text-foreground border-border',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ShadcnBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function ShadcnBadge({ className, variant, ...props }: ShadcnBadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { ShadcnBadge, badgeVariants };
