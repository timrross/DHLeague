const ISO3_TO_ISO2: Record<string, string> = {
  AUS: "au",
  AUT: "at",
  BEL: "be",
  BRA: "br",
  CAN: "ca",
  CHE: "ch",
  CHL: "cl",
  CHN: "cn",
  COL: "co",
  CZE: "cz",
  DEU: "de",
  DEN: "dk",
  ESP: "es",
  FIN: "fi",
  FRA: "fr",
  GBR: "gb",
  GER: "de",
  HKG: "hk",
  IRL: "ie",
  ITA: "it",
  JPN: "jp",
  KOR: "kr",
  MEX: "mx",
  NED: "nl",
  NOR: "no",
  NZL: "nz",
  POL: "pl",
  POR: "pt",
  RSA: "za",
  RUS: "ru",
  SGP: "sg",
  SLO: "si",
  SVN: "si",
  SUI: "ch",
  SWE: "se",
  TPE: "tw",
  UKR: "ua",
  USA: "us",
  ZAF: "za",
};

const NAME_TO_ISO2: Record<string, string> = {
  "ARGENTINA": "ar",
  "AUSTRALIA": "au",
  "AUSTRIA": "at",
  "BELGIUM": "be",
  "BRAZIL": "br",
  "CANADA": "ca",
  "CHILE": "cl",
  "CHINA": "cn",
  "COLOMBIA": "co",
  "CZECH REPUBLIC": "cz",
  "CZECHIA": "cz",
  "DENMARK": "dk",
  "FINLAND": "fi",
  "FRANCE": "fr",
  "GERMANY": "de",
  "GREAT BRITAIN": "gb",
  "HONG KONG": "hk",
  "IRELAND": "ie",
  "ITALY": "it",
  "JAPAN": "jp",
  "KOREA": "kr",
  "MEXICO": "mx",
  "NETHERLANDS": "nl",
  "NEW ZEALAND": "nz",
  "NORWAY": "no",
  "POLAND": "pl",
  "PORTUGAL": "pt",
  "RUSSIA": "ru",
  "SLOVENIA": "si",
  "SOUTH AFRICA": "za",
  "SOUTH KOREA": "kr",
  "SPAIN": "es",
  "SWEDEN": "se",
  "SWITZERLAND": "ch",
  "TAIWAN": "tw",
  "UNITED KINGDOM": "gb",
  "UNITED STATES": "us",
  "UNITED STATES OF AMERICA": "us",
  "UKRAINE": "ua",
};

const normalizeCountryKey = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getFlagCode = (country?: string | null) => {
  if (!country) return null;
  const trimmed = country.trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) {
    return upper.toLowerCase();
  }

  const iso2FromIso3 = ISO3_TO_ISO2[upper];
  if (iso2FromIso3) {
    return iso2FromIso3;
  }

  const normalized = normalizeCountryKey(upper);
  return NAME_TO_ISO2[normalized] ?? null;
};
