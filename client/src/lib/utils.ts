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
  if (url.trim() === '') return undefined;
  return url;
}

/**
 * Get initials from a name (first letter of each word)
 */
export function getInitials(name: string): string {
  if (!name) return '';
  return name.split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

/**
 * Generate a deterministic color based on a string
 * This ensures a rider always gets the same background color
 */
export function getColorFromName(name: string): string {
  // Define a palette of colors that work well with white text
  const colors = [
    'bg-red-600',
    'bg-blue-600',
    'bg-green-600',
    'bg-yellow-600',
    'bg-purple-600',
    'bg-pink-600',
    'bg-indigo-600',
    'bg-teal-600',
  ];

  // Simple hash function for the name string
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Get a positive index from the hash
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
