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

export function buildRiderPlaceholderSvg(params: {
  displayName: string;
  countryIso2?: string;
  size?: number;
}): string {
  const size = Math.max(64, params.size ?? 256);
  const initials = getInitials(params.displayName || "?") || "?";
  const gradientId = `grad-${Math.random().toString(36).slice(2, 8)}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeXml(
    params.displayName,
  )} placeholder">
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#1e293b" />
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.12)}" fill="url(#${gradientId})" />
    <rect x="${size * 0.08}" y="${size * 0.08}" width="${size * 0.84}" height="${size * 0.84}" rx="${Math.floor(
      size * 0.1,
    )}" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#e2e8f0" font-family="Inter, system-ui, sans-serif" font-size="${Math.floor(
      size * 0.3,
    )}" font-weight="800" letter-spacing="2">${escapeXml(initials)}</text>
  </svg>`;
}
