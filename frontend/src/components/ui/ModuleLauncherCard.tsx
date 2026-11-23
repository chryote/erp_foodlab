import React from 'react';
import { cn } from '@/lib/utils';

export type ModuleAccent = 'cfo' | 'cho' | 'cpo' | 'cdo' | 'cmo';

export interface ModuleLauncherCardProps {
  code: string;
  title: string;
  accent?: ModuleAccent;
  isSelected?: boolean;
  onClick?: () => void;
}

const ACCENT_SELECTED_CLASSES: Record<ModuleAccent, string> = {
  cfo: 'border-primary ring-2 ring-primary/30',
  cho: 'border-primary ring-2 ring-primary/30',
  cpo: 'border-primary ring-2 ring-primary/30',
  cdo: 'border-primary ring-2 ring-primary/30',
  cmo: 'border-primary ring-2 ring-primary/30',
};

export const ModuleLauncherCard: React.FC<ModuleLauncherCardProps> = ({
  code,
  title,
  accent = 'cfo',
  isSelected = false,
  onClick,
}) => {
  return (
    <button
      type="button"
      data-testid={`module-card-${code}`}
      aria-pressed={isSelected}
      className={cn(
        'flex min-h-[84px] flex-col items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-center text-card-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
        isSelected && ACCENT_SELECTED_CLASSES[accent]
      )}
      onClick={onClick}
    >
      <span className="text-[15px] font-semibold leading-snug tracking-tight">
        {title}
      </span>
    </button>
  );
};
