import clsx, { type ClassValue } from 'clsx';

/** Joins conditional class names — replaces messy inline template-literal ternaries. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs);
}
