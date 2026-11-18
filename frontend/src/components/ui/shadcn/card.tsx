import * as React from 'react';
import { cn } from '@/lib/utils';

const ShadcnCard = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' | 'article' }
>(({ className, as: Comp = 'section', ...props }, ref) => (
  <Comp
    ref={ref as React.Ref< never >}
    className={cn(
      'rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6',
      className
    )}
    {...props}
  />
));
ShadcnCard.displayName = 'ShadcnCard';

const ShadcnCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center justify-between gap-4 pb-4', className)}
    {...props}
  />
));
ShadcnCardHeader.displayName = 'ShadcnCardHeader';

const ShadcnCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
ShadcnCardTitle.displayName = 'ShadcnCardTitle';

const ShadcnCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground mt-1', className)}
    {...props}
  />
));
ShadcnCardDescription.displayName = 'ShadcnCardDescription';

const ShadcnCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-0', className)} {...props} />
));
ShadcnCardContent.displayName = 'ShadcnCardContent';

export {
  ShadcnCard,
  ShadcnCardHeader,
  ShadcnCardTitle,
  ShadcnCardDescription,
  ShadcnCardContent,
};
