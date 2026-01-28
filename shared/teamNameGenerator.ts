// Word lists for generating random team names
const adjectives = [
  "Flying", "Raging", "Swift", "Mighty", "Fearless",
  "Thunder", "Steel", "Iron", "Golden", "Silver",
  "Blazing", "Savage", "Wild", "Epic", "Radical",
  "Gnarly", "Stoked", "Rowdy", "Charging", "Sending",
  "Full", "Gnarcore", "Steep", "Rocky", "Muddy",
  "Dusty", "Rooted", "Pinned", "Flat", "Loamy",
];

const nouns = [
  "Shredders", "Riders", "Racers", "Bombers", "Senders",
  "Rippers", "Slayers", "Crushers", "Warriors", "Legends",
  "Squad", "Crew", "Gang", "Pack", "Posse",
  "Wolves", "Bears", "Eagles", "Hawks", "Falcons",
  "Mustangs", "Coyotes", "Vipers", "Panthers", "Tigers",
  "Enduro", "Gravity", "Downhill", "Freeride", "Huckers",
];

const formats = [
  (adj: string, noun: string) => `${adj} ${noun}`,
  (adj: string, noun: string) => `The ${adj} ${noun}`,
  (adj: string, noun: string) => `Team ${adj}`,
  (adj: string, noun: string) => `${noun} United`,
  (adj: string, noun: string) => `${adj} ${noun} Racing`,
];

/**
 * Generates a random team name
 */
export function generateRandomTeamName(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const format = formats[Math.floor(Math.random() * formats.length)];

  return format(adjective, noun);
}

/**
 * Generates multiple unique random team names
 */
export function generateTeamNameSuggestions(count: number = 5): string[] {
  const suggestions = new Set<string>();

  while (suggestions.size < count) {
    suggestions.add(generateRandomTeamName());
  }

  return Array.from(suggestions);
}
