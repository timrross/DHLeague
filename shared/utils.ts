/**
 * Utility functions for working with data
 */

/**
 * Generates a consistent ID for a rider based on their name
 * 
 * @param name The rider's full name
 * @returns A normalized ID string
 */
export function generateRiderId(name: string): string {
  if (!name) return '';

  // Normalize the name:
  // 1. Convert to lowercase
  // 2. Remove any special characters or punctuation
  // 3. Replace spaces with dashes
  // 4. Remove any accents or diacritics
  
  // Convert to lowercase
  let normalized = name.toLowerCase();
  
  // Handle accents/diacritics - replace them with non-accented versions
  normalized = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Remove special characters except alphanumeric and spaces
  normalized = normalized.replace(/[^\w\s]/g, '');
  
  // Replace spaces with dashes
  normalized = normalized.replace(/\s+/g, '-');
  
  return normalized;
}