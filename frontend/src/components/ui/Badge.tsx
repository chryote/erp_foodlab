import React from 'react';

export type BadgeVariant = 'ok' | 'err' | 'warn' | 'info' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  className = '',
  children,
  ...rest
}) => {
  return (
    <span
      className={`ui-badge ui-badge-${variant} ${className}`.trim()}
      {...rest}
    >
      {children}
    </span>
  );
};
