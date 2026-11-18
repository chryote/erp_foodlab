import React from 'react';
import type { ModuleAccent } from './ModuleLauncherCard';

export interface HorizontalMenuItem {
  code: string;
  title: string;
}

export interface HorizontalMenuCardProps {
  code: string;
  title: string;
  accent?: ModuleAccent;
  isSelected?: boolean;
  onClick?: () => void;
}

export const HorizontalMenuCard: React.FC<HorizontalMenuCardProps> = ({
  code,
  title,
  accent = 'cfo',
  isSelected = false,
  onClick,
}) => {
  return (
    <button
      type="button"
      data-testid={`horizontal-menu-card-${code}`}
      aria-pressed={isSelected}
      className={`ui-horizontal-menu-card accent-${accent} ${isSelected ? 'selected' : ''}`.trim()}
      onClick={onClick}
    >
      <span className="ui-horizontal-menu-title">{title}</span>
    </button>
  );
};

export interface HorizontalMenuProps {
  items: HorizontalMenuItem[];
  accent?: ModuleAccent;
  selectedCode?: string | null;
  ariaLabel?: string;
  testId?: string;
  onSelect?: (item: HorizontalMenuItem) => void;
}

export const HorizontalMenu: React.FC<HorizontalMenuProps> = ({
  items,
  accent = 'cfo',
  selectedCode = null,
  ariaLabel = 'Module Horizontal Submenu',
  testId = 'horizontal-menu',
  onSelect,
}) => {
  return (
    <nav
      aria-label={ariaLabel}
      data-testid={testId}
      className="ui-horizontal-menu-grid"
    >
      {items.map((item) => (
        <HorizontalMenuCard
          key={item.code}
          code={item.code}
          title={item.title}
          accent={accent}
          isSelected={selectedCode === item.code}
          onClick={() => onSelect?.(item)}
        />
      ))}
    </nav>
  );
};
