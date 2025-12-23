import fs from "node:fs";
import path from "node:path";

const FLAG_DIR = path.resolve(process.cwd(), "src/assets/flags");

function escapeXml(value: string): string {
  return value.replace(/["'&<>]/g, (char) => {
    switch (char) {
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      default:
        return char;
    }
  });
}

function getInitials(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3);
}

function loadFlagData(countryIso2?: string): string | null {
  if (!countryIso2) return null;
  const filename = path.join(FLAG_DIR, `${countryIso2.toLowerCase()}.svg`);

  if (!fs.existsSync(filename)) {
    return null;
  }

  try {
    return fs.readFileSync(filename, "utf8");
  } catch (err) {
    console.error(`Failed to read flag asset for ${countryIso2}:`, err);
    return null;
  }
}

export function buildRiderPlaceholderSvg(params: {
  displayName: string;
  countryIso2?: string;
  size?: number;
}): string {
  const size = Math.max(64, params.size ?? 256);
  const initials = getInitials(params.displayName || "?") || "?";
  const gradientId = `grad-${Math.random().toString(36).slice(2, 8)}`;
  const badgeSize = Math.max(40, Math.floor(size * 0.28));
  const badgePadding = Math.floor(size * 0.08);
  const badgeX = size - badgeSize - badgePadding;
  const badgeY = size - badgeSize - badgePadding;
  const flagSvg = loadFlagData(params.countryIso2);
  const badgeLabel = params.countryIso2?.toUpperCase() ?? "?";

  const badgeCircle = `<circle cx="${badgeX + badgeSize / 2}" cy="${badgeY + badgeSize / 2}" r="${badgeSize / 2}" fill="#0f172a" stroke="rgba(255,255,255,0.28)" />`;

  const flagImage = flagSvg
    ? `${badgeCircle}<image href="data:image/svg+xml;base64,${Buffer.from(flagSvg).toString("base64")}" x="${badgeX}" y="${badgeY}" width="${badgeSize}" height="${badgeSize}" clip-path="url(#flagClip)" preserveAspectRatio="xMidYMid slice" />`
    : `${badgeCircle}
       <text x="${badgeX + badgeSize / 2}" y="${badgeY + badgeSize / 2 + 6}" text-anchor="middle" fill="#f8fafc" font-size="${badgeSize / 3}" font-family="Inter, system-ui, sans-serif" font-weight="700">${escapeXml(badgeLabel)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeXml(
    params.displayName,
  )} placeholder">
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#1e293b" />
      </linearGradient>
      <clipPath id="flagClip">
        <circle cx="${badgeX + badgeSize / 2}" cy="${badgeY + badgeSize / 2}" r="${badgeSize / 2}" />
      </clipPath>
    </defs>
    <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.12)}" fill="url(#${gradientId})" />
    <rect x="${size * 0.08}" y="${size * 0.08}" width="${size * 0.84}" height="${size * 0.84}" rx="${Math.floor(
      size * 0.1,
    )}" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#e2e8f0" font-family="Inter, system-ui, sans-serif" font-size="${Math.floor(
      size * 0.3,
    )}" font-weight="800" letter-spacing="2">${escapeXml(initials)}</text>
    ${flagImage}
  </svg>`;
}
