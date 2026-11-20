import React from 'react';
import { ShadcnButton } from './shadcn/button';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

const VARIANT_MAP = {
  primary: 'default',
  secondary: 'secondary',
  ghost: 'ghost',
} as const;

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  type = 'button',
  className,
  children,
  ...rest
}) => {
  return (
    <ShadcnButton
      type={type}
      variant={VARIANT_MAP[variant]}
      className={className}
      {...rest}
    >
      {children}
    </ShadcnButton>
  );
};
