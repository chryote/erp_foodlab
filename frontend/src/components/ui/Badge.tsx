import React from 'react';
import { ShadcnBadge } from './shadcn/badge';

export type BadgeVariant = 'ok' | 'err' | 'warn' | 'info' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const VARIANT_MAP = {
  ok: 'success',
  err: 'destructive',
  warn: 'warning',
  info: 'info',
  neutral: 'secondary',
} as const;

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  className,
  children,
  ...rest
}) => {
  return (
    <ShadcnBadge
      variant={VARIANT_MAP[variant]}
      className={className}
      {...rest}
    >
      {children}
    </ShadcnBadge>
  );
};
