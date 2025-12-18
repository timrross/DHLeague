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

function isAllUppercaseTokens(value: string): boolean {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every(isUppercaseToken);
}

function titleCaseTokens(tokens: string[]): string {
  return tokens
    .map(capitalizeWord)
    .filter((part) => part.trim().length > 0)
    .join(" ");
}

function formatLastNameFromTokens(tokens: string[]): string {
  const titled = titleCaseTokens(tokens);
  return titled.toUpperCase();
}

function splitNaturalOrderTokens(tokens: string[]): {
  firstNameTokens: string[];
  lastNameTokens: string[];
} {
  if (tokens.length <= 1) {
    return { firstNameTokens: tokens, lastNameTokens: [] };
  }

  const surnameParticles = new Set([
    "da",
    "de",
    "del",
    "della",
    "der",
    "den",
    "di",
    "du",
    "la",
    "le",
    "van",
    "von",
    "st",
    "st.",
    "saint",
  ]);

  let lastNameStart = tokens.length - 1;
  while (
    lastNameStart > 0 &&
    surnameParticles.has(tokens[lastNameStart - 1].toLowerCase())
  ) {
    lastNameStart -= 1;
  }

  let lastNameTokens = tokens.slice(lastNameStart);
  let firstNameTokens = tokens.slice(0, lastNameStart);

  // If we have a long name with no particles detected, assume a 2-token surname.
  if (lastNameTokens.length === 1 && tokens.length >= 4) {
    lastNameTokens = tokens.slice(-2);
    firstNameTokens = tokens.slice(0, Math.max(tokens.length - 2, 0));
  }

  return { firstNameTokens, lastNameTokens };
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
    const { firstNameTokens, lastNameTokens } = splitNaturalOrderTokens(tokens);
    const formattedFirst = titleCaseTokens(firstNameTokens);
    const formattedLast = formatLastNameFromTokens(lastNameTokens);
    return [formattedFirst, formattedLast].filter(Boolean).join(" ").trim();
  }

  const hasMixedCaseTail = uppercaseCount < tokens.length;
  const lastNameTokens = hasMixedCaseTail
    ? tokens.slice(0, uppercaseCount)
    : tokens.slice(0, Math.max(tokens.length - 1, 1));

  const firstNameTokens = hasMixedCaseTail
    ? tokens.slice(uppercaseCount)
    : tokens.slice(Math.max(tokens.length - 1, 1));

  const formattedFirst = titleCaseTokens(firstNameTokens);
  const formattedLast = formatLastNameFromTokens(lastNameTokens);

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
    const firstAllUpper = isAllUppercaseTokens(first);
    const lastAllUpper = isAllUppercaseTokens(last);

    // Some sources (and/or older imports) may store "LASTNAME" in firstName and
    // "Firstname" in lastName. Detect that shape and swap for display.
    if (firstAllUpper && !lastAllUpper) {
      const formattedFirst = titleCaseTokens(last.split(/\s+/));
      const formattedLast = formatLastNameFromTokens(first.split(/\s+/));
      return `${formattedFirst} ${formattedLast}`.trim();
    }

    // If both fields are uppercase and we have a combined name, prefer parsing
    // the combined field (handles cases like "SMITH JOHN").
    if (firstAllUpper && lastAllUpper && rider.name) {
      const fromName = formatNameFromSingleField(rider.name);
      if (fromName) return fromName;
    }

    const formattedFirst = titleCaseTokens(first.split(/\s+/));
    const formattedLast = formatLastNameFromTokens(last.split(/\s+/));
    return `${formattedFirst} ${formattedLast}`.trim();
  }

  if (rider.name) {
    return formatNameFromSingleField(rider.name);
  }

  return "";
}
