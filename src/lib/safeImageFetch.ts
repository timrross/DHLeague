import dns from "node:dns/promises";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isPrivateOrLoopback(address: string, family: 4 | 6): boolean {
  if (family === 6) {
    const normalized = address.toLowerCase();
    if (normalized === "::1") return true;
    // fc00::/7 (unique local), fe80::/10 (link-local)
    return normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80");
  }

  const parts = address.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return true;
  }

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

async function assertSafeRemoteAddress(url: URL) {
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error("Only http(s) URLs are allowed");
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "ip6-localhost") {
    throw new Error("Localhost URLs are not allowed");
  }

  const ipFamily = isIP(host);
  const addresses =
    ipFamily === 0
      ? await dns.lookup(host, { all: true })
      : [{ address: host, family: ipFamily as 4 | 6 }];

  if (addresses.length === 0) {
    throw new Error("Could not resolve remote host");
  }

  for (const entry of addresses) {
    const family = entry.family as 4 | 6;
    if (isPrivateOrLoopback(entry.address, family)) {
      throw new Error("URL resolves to a private or disallowed address");
    }
  }
}

function sniffMimeType(buffer: Buffer): { mime: string | null; extension: string | null } {
  if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", extension: ".jpg" };
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: "image/png", extension: ".png" };
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mime: "image/webp", extension: ".webp" };
  }

  return { mime: null, extension: null };
}

async function fetchWithRedirects(url: URL, signal: AbortSignal, depth = 0): Promise<Response> {
  await assertSafeRemoteAddress(url);

  const response = await fetch(url, { redirect: "manual", signal });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) {
      throw new Error("Redirect location missing");
    }

    if (depth >= 3) {
      throw new Error("Too many redirects while downloading image");
    }

    const nextUrl = new URL(location, url);
    return fetchWithRedirects(nextUrl, signal, depth + 1);
  }

  return response;
}

export async function validateRemoteImageUrl(url: string): Promise<URL> {
  const parsed = new URL(url);
  await assertSafeRemoteAddress(parsed);
  return parsed;
}

export async function downloadImageToFile(opts: {
  url: string;
  destPath: string;
  maxBytes: number;
  timeoutMs: number;
}): Promise<{
  finalPath: string;
  mimeType: string;
  sha256: string;
  byteLength: number;
}> {
  const parsedUrl = new URL(opts.url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);

  try {
    const response = await fetchWithRedirects(parsedUrl, controller.signal);

    if (!response.ok) {
      throw new Error(`Failed to fetch image (${response.status})`);
    }

    const declaredMime = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (declaredMime && !ALLOWED_MIME_TYPES.has(declaredMime)) {
      throw new Error("URL did not return an allowed image mime type");
    }

    if (!response.body) {
      throw new Error("Empty response body");
    }

    const reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let total = 0;
    let sniffed: { mime: string | null; extension: string | null } | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (!value) continue;

      total += value.length;
      if (total > opts.maxBytes) {
        throw new Error("Image exceeds maximum allowed size");
      }

      const buffer = Buffer.from(value);
      chunks.push(buffer);

      if (!sniffed) {
        const head = Buffer.concat(chunks).subarray(0, 24);
        sniffed = sniffMimeType(head);
      }
    }

    if (!sniffed) {
      sniffed = sniffMimeType(Buffer.concat(chunks).subarray(0, 24));
    }

    if (!sniffed.mime || !sniffed.extension) {
      throw new Error("Downloaded file is not a supported image type");
    }

    if (!ALLOWED_MIME_TYPES.has(sniffed.mime)) {
      throw new Error("Downloaded image type is not permitted");
    }

    const data = Buffer.concat(chunks);
    const finalPath = opts.destPath.endsWith(sniffed.extension)
      ? opts.destPath
      : `${opts.destPath}${sniffed.extension}`;

    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.writeFile(finalPath, data);

    const sha256 = createHash("sha256").update(data).digest("hex");

    return {
      finalPath,
      mimeType: sniffed.mime,
      sha256,
      byteLength: data.length,
    };
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
