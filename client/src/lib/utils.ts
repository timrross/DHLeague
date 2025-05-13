import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely convert any image url to a string or undefined (for use with AvatarImage)
 * This handles null, undefined, or empty string cases
 */
export function safeImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url;
}
