import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function resolveDocumentUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }
  const localStorageMatch =
    /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/storage\/.+)$/i.exec(
      trimmed
    );
  if (localStorageMatch) {
    return localStorageMatch[1];
  }
  return trimmed;
}
