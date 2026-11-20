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
  cfo: 'border-emerald-500 ring-2 ring-emerald-500/30',
  cho: 'border-blue-500 ring-2 ring-blue-500/30',
  cpo: 'border-amber-500 ring-2 ring-amber-500/30',
  cdo: 'border-purple-500 ring-2 ring-purple-500/30',
  cmo: 'border-rose-500 ring-2 ring-rose-500/30',
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
