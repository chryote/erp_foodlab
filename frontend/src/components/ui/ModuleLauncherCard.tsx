import React from 'react';

export type ModuleAccent = 'cfo' | 'cho' | 'cpo' | 'cdo' | 'cmo';

export interface ModuleLauncherCardProps {
  code: string;
  title: string;
  icon: React.ReactNode;
  accent?: ModuleAccent;
  isSelected?: boolean;
  onClick?: () => void;
}

export const ModuleLauncherCard: React.FC<ModuleLauncherCardProps> = ({
  code,
  title,
  icon,
  accent = 'cfo',
  isSelected = false,
  onClick,
}) => {
  return (
    <button
      type="button"
      data-testid={`module-card-${code}`}
      aria-pressed={isSelected}
      className={`ui-module-launcher accent-${accent} ${isSelected ? 'selected' : ''}`.trim()}
      onClick={onClick}
    >
      <div className={`ui-module-icon-circle icon-${accent}`} aria-hidden="true">
        {icon}
      </div>
      <span className="ui-module-title">{title}</span>
    </button>
  );
};
