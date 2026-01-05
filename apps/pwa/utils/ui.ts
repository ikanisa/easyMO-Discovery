
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges tailwind classes reliably, handling conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Triggers mobile haptic feedback if supported.
 */
export function hapticFeedback(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (!window.navigator.vibrate) return;
  
  switch(style) {
    case 'light': window.navigator.vibrate(10); break;
    case 'medium': window.navigator.vibrate(25); break;
    case 'heavy': window.navigator.vibrate(50); break;
  }
}
