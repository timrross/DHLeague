import { Request, Response } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { storage } from "../storage";
import { buildRiderPlaceholderSvg } from "../../src/lib/riderPlaceholderSvg";
import {
  downloadImageToFile,
  validateRemoteImageUrl,
} from "../../src/lib/safeImageFetch";
import { RiderImageSource } from "@shared/schema";

const UPLOAD_BASE = path.resolve(process.cwd(), "uploads", "riders");
const PUBLIC_UPLOAD_PREFIX = "/uploads/riders";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 10_000;

const imageFetcher = {
  validateRemoteImageUrl,
  downloadImageToFile,
};

export function __setImageFetcherForTests(mockFetcher: Partial<typeof imageFetcher>) {
  if (mockFetcher.validateRemoteImageUrl) {
    imageFetcher.validateRemoteImageUrl = mockFetcher.validateRemoteImageUrl;
  }
  if (mockFetcher.downloadImageToFile) {
    imageFetcher.downloadImageToFile = mockFetcher.downloadImageToFile;
  }
}

function resolveStoredPath(filename: string) {
  return `${PUBLIC_UPLOAD_PREFIX}/${filename}`;
}

function getDisplayName(rider: { name: string; firstName: string | null; lastName: string | null }) {
  if (rider.lastName && rider.firstName) {
    return `${rider.lastName} ${rider.firstName}`;
  }
  return rider.name;
}

export async function getRiderPlaceholderImage(req: Request, res: Response) {
  try {
    const { uciId } = req.params;
    const rider = await storage.getRiderByUciId(uciId);

    if (!rider) {
      return res.status(404).send("Rider not found");
    }

    const svg = buildRiderPlaceholderSvg({
      displayName: getDisplayName(rider),
      countryIso2: rider.country ?? undefined,
    });

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=86400");
    res.status(200).send(svg);
  } catch (error) {
    console.error("Failed to build placeholder SVG:", error);
    res.status(500).send("Unable to generate placeholder");
  }
}

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_BASE, { recursive: true });
}

function inferImageSource(mode: "reset" | "external" | "copy"): RiderImageSource {
  if (mode === "external") return "manual_url";
  if (mode === "copy") return "manual_copied";
  return "placeholder";
}

export async function updateRiderImage(req: Request, res: Response) {
  const { mode, url } = req.body as { mode?: string; url?: string };
  const { uciId } = req.params;

  if (!uciId) {
    return res.status(400).json({ message: "uciId is required" });
  }

  if (!mode || !["reset", "external", "copy"].includes(mode)) {
    return res.status(400).json({ message: "mode must be one of reset, external, copy" });
  }

  if ((mode === "external" || mode === "copy") && (!url || typeof url !== "string")) {
    return res.status(400).json({ message: "url is required for external or copy mode" });
  }

  try {
    const rider = await storage.getRiderByUciId(uciId);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    const now = new Date();
    let imagePath = "";
    let imageMimeType: string | null = null;
    let imageContentHash: string | null = null;
    let imageOriginalUrl: string | null = null;
    let imageSource: RiderImageSource = inferImageSource(mode as any);
    const safeFileBase = rider.uciId.replace(/[^a-z0-9_-]/gi, "_") || rider.id.toString();

    if (mode === "reset") {
      // noop
    } else if (mode === "external" && url) {
      await imageFetcher.validateRemoteImageUrl(url);
      imagePath = url;
      imageOriginalUrl = url;
    } else if (mode === "copy" && url) {
      await ensureUploadDir();
      const destPath = path.join(UPLOAD_BASE, safeFileBase);
      const result = await imageFetcher.downloadImageToFile({
        url,
        destPath,
        maxBytes: MAX_IMAGE_BYTES,
        timeoutMs: IMAGE_TIMEOUT_MS,
      });
      imagePath = resolveStoredPath(path.basename(result.finalPath));
      imageMimeType = result.mimeType;
      imageContentHash = result.sha256;
      imageOriginalUrl = url;
    }

    const updated = await storage.updateRider(rider.id, {
      image: imagePath,
      imageSource,
      imageOriginalUrl,
      imageUpdatedAt: now,
      imageContentHash,
      imageMimeType,
    });

    res.json({
      message: "Rider image updated",
      rider: updated,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : "Failed to update rider image";
    console.error("Error updating rider image:", error);
    res.status(400).json({ message });
  }
}
