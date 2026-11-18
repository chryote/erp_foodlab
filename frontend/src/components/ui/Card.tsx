import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div' | 'article';
  variant?: 'default' | 'highlighted';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  as: Component = 'section',
  variant = 'default',
  className = '',
  children,
  ...rest
}) => {
  const variantClass = variant === 'highlighted' ? 'ui-card-highlighted' : '';
  return (
    <Component className={`ui-card ${variantClass} ${className}`.trim()} {...rest}>
      {children}
    </Component>
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
    <div className="ui-card-header">
      <div>
        {eyebrow && <span className="ui-eyebrow">{eyebrow}</span>}
        <h2 className="ui-card-title">{title}</h2>
        {subtitle && <p className="ui-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ui-card-actions">{actions}</div>}
    </div>
  );
};
