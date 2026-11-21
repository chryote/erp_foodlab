import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ModuleAccent } from './ModuleLauncherCard';

export interface HorizontalMenuItem {
  code: string;
  title: string;
  children?: HorizontalMenuItem[];
}

export interface HorizontalMenuCardProps {
  code: string;
  title: string;
  accent?: ModuleAccent;
  isSelected?: boolean;
  onClick?: () => void;
}

const ACCENT_SELECTED_CLASSES: Record<ModuleAccent, string> = {
  cfo: 'border-primary bg-primary/10 ring-2 ring-primary/25',
  cho: 'border-primary bg-primary/10 ring-2 ring-primary/25',
  cpo: 'border-primary bg-primary/10 ring-2 ring-primary/25',
  cdo: 'border-primary bg-primary/10 ring-2 ring-primary/25',
  cmo: 'border-primary bg-primary/10 ring-2 ring-primary/25',
};

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
      className={cn(
        'flex min-h-[54px] items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-semibold text-card-foreground transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer',
        isSelected && ACCENT_SELECTED_CLASSES[accent]
      )}
      onClick={onClick}
    >
      <span>{title}</span>
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
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5"
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

export interface HorizontalMenuStackProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const HorizontalMenuStack: React.FC<HorizontalMenuStackProps> = ({
  className,
  children,
  ...rest
}) => {
  return (
    <div className={cn('flex flex-col gap-3', className)} {...rest}>
      {children}
    </div>
  );
};

export interface CascadingHorizontalMenuProps {
  items: HorizontalMenuItem[];
  accent?: ModuleAccent;
  selectedCode?: string | null;
  selectedChildCode?: string | null;
  ariaLabel?: string;
  subMenuAriaLabel?: string;
  testId?: string;
  subMenuTestId?: string;
  onSelect?: (item: HorizontalMenuItem) => void;
  onSelectChild?: (item: HorizontalMenuItem) => void;
}

export const CascadingHorizontalMenu: React.FC<CascadingHorizontalMenuProps> = ({
  items,
  accent = 'cfo',
  selectedCode,
  selectedChildCode,
  ariaLabel = 'Module Horizontal Submenu',
  subMenuAriaLabel,
  testId = 'horizontal-menu',
  subMenuTestId,
  onSelect,
  onSelectChild,
}) => {
  const [internalSelectedCode, setInternalSelectedCode] = useState<string | null>(
    null
  );
  const [internalChildCode, setInternalChildCode] = useState<string | null>(
    null
  );

  const activeCode =
    selectedCode !== undefined ? selectedCode : internalSelectedCode;
  const activeChildCode =
    selectedChildCode !== undefined ? selectedChildCode : internalChildCode;

  const activeItem = items.find((item) => item.code === activeCode) ?? null;

  const handleSelectPrimary = (item: HorizontalMenuItem) => {
    if (selectedCode === undefined) {
      setInternalSelectedCode(item.code);
    }
    if (selectedChildCode === undefined) {
      setInternalChildCode(null);
    }
    onSelect?.(item);
  };

  const handleSelectChild = (childItem: HorizontalMenuItem) => {
    if (selectedChildCode === undefined) {
      setInternalChildCode(childItem.code);
    }
    onSelectChild?.(childItem);
  };

  return (
    <HorizontalMenuStack>
      <HorizontalMenu
        items={items}
        accent={accent}
        selectedCode={activeCode}
        ariaLabel={ariaLabel}
        testId={testId}
        onSelect={handleSelectPrimary}
      />

      {activeItem?.children && activeItem.children.length > 0 && (
        <HorizontalMenu
          items={activeItem.children}
          accent={accent}
          selectedCode={activeChildCode}
          ariaLabel={subMenuAriaLabel ?? `${activeItem.title} Submenu`}
          testId={subMenuTestId ?? `horizontal-submenu-${activeItem.code}`}
          onSelect={handleSelectChild}
        />
      )}
    </HorizontalMenuStack>
  );
};
