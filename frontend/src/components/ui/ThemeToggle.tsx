import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { setTheme, useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export interface ThemeToggleProps {
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  showLabel = false,
}) => {
  const theme = useTheme();
  const isDark = theme === 'dark';

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-pressed={isDark}
      data-testid="theme-toggle"
      onClick={handleToggle}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-card text-foreground transition-colors hover:bg-accent',
        showLabel ? 'px-2.5 py-1.5 text-xs font-semibold' : 'size-9'
      )}
    >
      {showLabel ? (
        <>
          <span>Dark mode</span>
          <span
            aria-hidden="true"
            className={cn(
              'relative h-4 w-7 rounded-full transition-colors',
              isDark ? 'bg-primary' : 'bg-muted-foreground/50'
            )}
          >
            <span
              className={cn(
                'absolute left-0.5 top-0.5 size-3 rounded-full bg-white transition-transform',
                isDark ? 'translate-x-3' : 'translate-x-0'
              )}
            />
          </span>
        </>
      ) : isDark ? (
        <Sun aria-hidden="true" className="size-4" />
      ) : (
        <Moon aria-hidden="true" className="size-4" />
      )}
    </button>
  );
};
