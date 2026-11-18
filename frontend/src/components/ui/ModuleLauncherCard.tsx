import React from 'react';
import { cn } from '@/lib/utils';

export type ModuleAccent = 'cfo' | 'cho' | 'cpo' | 'cdo' | 'cmo';

export interface ModuleLauncherCardProps {
  code: string;
  title: string;
  icon: React.ReactNode;
  accent?: ModuleAccent;
  isSelected?: boolean;
  onClick?: () => void;
}

const ACCENT_ICON_CLASSES: Record<ModuleAccent, string> = {
  cfo: 'text-emerald-400 border-emerald-500/35 bg-emerald-500/12',
  cho: 'text-blue-400 border-blue-500/35 bg-blue-500/12',
  cpo: 'text-amber-400 border-amber-500/35 bg-amber-500/12',
  cdo: 'text-purple-400 border-purple-500/35 bg-purple-500/12',
  cmo: 'text-rose-400 border-rose-500/35 bg-rose-500/12',
};

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
      className={cn(
        'flex min-h-[168px] flex-col items-center justify-center gap-3.5 rounded-2xl border border-border bg-card px-4 py-6 text-center text-card-foreground transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
        isSelected && ACCENT_SELECTED_CLASSES[accent]
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'flex h-[72px] w-[72px] items-center justify-center rounded-full border transition-transform',
          ACCENT_ICON_CLASSES[accent]
        )}
        aria-hidden="true"
      >
        {icon}
      </div>
      <span className="text-[15px] font-semibold leading-snug tracking-tight">
        {title}
      </span>
    </button>
  );
};
