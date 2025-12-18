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

function capitalizeWord(word: string): string {
  if (!word) return "";

  return word
    .toLowerCase()
    .split(/([-’'])/)
    .map((segment, index) => {
      // Keep punctuation markers (hyphens, apostrophes) as-is while capitalizing each segment
      if (index % 2 === 1) return segment;
      if (!segment) return segment;
      return segment[0].toUpperCase() + segment.slice(1);
    })
    .join("");
}

function isUppercaseToken(token: string): boolean {
  if (!token) return false;
  const hasLetter = /[A-Z]/i.test(token);
  return hasLetter && token === token.toUpperCase();
}

function titleCaseTokens(tokens: string[]): string {
  return tokens
    .map(capitalizeWord)
    .filter((part) => part.trim().length > 0)
    .join(" ");
}

function formatNameFromSingleField(rawName: string): string {
  const cleaned = rawName.trim();
  if (!cleaned) return "";

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) return capitalizeWord(tokens[0]);

  // Identify a run of uppercase tokens at the start (e.g., LASTNAME parts)
  let uppercaseCount = 0;
  for (const token of tokens) {
    if (isUppercaseToken(token)) {
      uppercaseCount++;
    } else {
      break;
    }
  }

  // If the name doesn't start with uppercase tokens, assume it's already Firstname Lastname
  if (uppercaseCount === 0) {
    return titleCaseTokens(tokens);
  }

  const hasMixedCaseTail = uppercaseCount < tokens.length;
  const lastNameTokens = hasMixedCaseTail
    ? tokens.slice(0, uppercaseCount)
    : tokens.slice(0, Math.max(tokens.length - 1, 1));

  const firstNameTokens = hasMixedCaseTail
    ? tokens.slice(uppercaseCount)
    : tokens.slice(Math.max(tokens.length - 1, 1));

  const formattedFirst = titleCaseTokens(firstNameTokens);
  const formattedLast = titleCaseTokens(lastNameTokens);

  return [formattedFirst, formattedLast].filter(Boolean).join(" ").trim();
}

export function formatRiderDisplayName(rider: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const first = rider.firstName?.trim();
  const last = rider.lastName?.trim();

  if (first && last) {
    const formattedFirst = titleCaseTokens(first.split(/\s+/));
    const formattedLast = titleCaseTokens(last.split(/\s+/));
    return `${formattedFirst} ${formattedLast}`.trim();
  }

  if (rider.name) {
    return formatNameFromSingleField(rider.name);
  }

  return "";
}
