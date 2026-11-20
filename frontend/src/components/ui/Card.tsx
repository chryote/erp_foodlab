import React from 'react';
import { cn } from '@/lib/utils';
import {
  ShadcnCard,
  ShadcnCardDescription,
  ShadcnCardHeader,
  ShadcnCardTitle,
} from './shadcn/card';

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div' | 'article';
  variant?: 'default' | 'highlighted';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  as = 'section',
  variant = 'default',
  className,
  children,
  ...rest
}) => {
  return (
    <ShadcnCard
      as={as}
      className={cn(
        variant === 'highlighted' && 'border-primary/60 shadow-lg',
        className
      )}
      {...rest}
    >
      {children}
    </ShadcnCard>
  );
};

export interface CardHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  actions,
}) => {
  return (
    <ShadcnCardHeader>
      <div>
        {eyebrow && (
          <span className="block text-[11px] font-bold uppercase tracking-widest text-primary mb-1">
            {eyebrow}
          </span>
        )}
        <ShadcnCardTitle>{title}</ShadcnCardTitle>
        {subtitle && <ShadcnCardDescription>{subtitle}</ShadcnCardDescription>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </ShadcnCardHeader>
  );
};
