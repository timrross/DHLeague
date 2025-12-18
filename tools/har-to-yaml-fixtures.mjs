#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import YAML from "yaml";

/**
 * HAR -> YAML fixtures (XHR/Fetch only)
 *
 * Usage:
 *   node tools/har-to-yaml-fixtures.mjs ./capture.har --out ./fixtures
 *
 * Options:
 *   --out <dir>           Output directory (default: ./fixtures)
 *   --strip-secrets       Remove Cookie/Authorization headers (default: true)
 *   --include-body        Include response body in YAML if small (default: true)
 *   --max-inline-bytes    Max bytes to inline response in YAML (default: 50_000)
 */

function isTargetDatarideIframe(entry) {
  const url = entry?.request?.url;
  if (!url) return false;

  try {
    const u = new URL(url);
    return (
      u.hostname === "dataride.uci.ch" &&
      u.pathname.startsWith("/iframe/") &&
      isXhrOrFetch(entry)
    );
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const args = {
    harPath: null,
    outDir: "./fixtures",
    stripSecrets: true,
    includeBody: true,
    maxInlineBytes: 50_000,
  };

  const positional = [];
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") args.outDir = argv[++i];
    else if (a === "--strip-secrets") args.stripSecrets = true;
    else if (a === "--no-strip-secrets") args.stripSecrets = false;
    else if (a === "--include-body") args.includeBody = true;
    else if (a === "--no-include-body") args.includeBody = false;
    else if (a === "--max-inline-bytes") args.maxInlineBytes = Number(argv[++i]);
    else if (a.startsWith("--")) throw new Error(`Unknown arg: ${a}`);
    else positional.push(a);
  }

  args.harPath = positional[0] ?? null;
  if (!args.harPath) {
    throw new Error("Missing HAR path.\nExample: node tools/har-to-yaml-fixtures.mjs ./capture.har --out ./fixtures");
  }
  return args;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function headerListToObject(headers = []) {
  const obj = {};
  for (const h of headers) {
    if (!h?.name) continue;
    obj[h.name] = h.value ?? "";
  }
  return obj;
}

function stripSecretHeaders(headersObj) {
  const out = { ...headersObj };
  for (const key of Object.keys(out)) {
    const k = key.toLowerCase();
    if (k === "cookie" || k === "authorization") delete out[key];
  }
  return out;
}

function isXhrOrFetch(entry) {
  // Chrome HAR typically includes _resourceType: "xhr" | "fetch"
  const rt = entry?._resourceType?.toLowerCase?.();
  if (rt === "xhr" || rt === "fetch") return true;

  // Fallback heuristics if _resourceType is missing:
  const reqHeaders = headerListToObject(entry?.request?.headers ?? []);
  const accept = (reqHeaders["accept"] || reqHeaders["Accept"] || "").toLowerCase();
  const xrw = (reqHeaders["x-requested-with"] || reqHeaders["X-Requested-With"] || "").toLowerCase();
  const mime = (entry?.response?.content?.mimeType || "").toLowerCase();

  if (xrw.includes("xmlhttprequest")) return true;
  if (accept.includes("application/json")) return true;
  if (mime.includes("application/json")) return true;

  return false;
}

function safeSlug(s) {
  return s
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function hashShort(input) {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 8);
}

function decodePostData(entry) {
  const pd = entry?.request?.postData;
  if (!pd) return null;

  // HAR may contain either:
  // - postData.text (raw)
  // - postData.params (structured name/value)
  const mimeType = pd.mimeType || "";
  if (Array.isArray(pd.params) && pd.params.length) {
    const data = {};
    for (const p of pd.params) {
      data[p.name] = p.value ?? "";
    }
    return { encoding: mimeType.includes("x-www-form-urlencoded") ? "form-urlencoded" : "params", data };
  }

  if (typeof pd.text === "string") {
    return { encoding: mimeType || "raw", text: pd.text };
  }

  return { encoding: mimeType || "unknown", raw: pd };
}

function decodeResponseBody(entry) {
  const content = entry?.response?.content;
  if (!content) return null;

  let text = content.text ?? "";
  const encoding = content.encoding ?? null; // "base64" sometimes
  const mimeType = content.mimeType ?? null;

  if (encoding === "base64" && typeof text === "string") {
    try {
      const buf = Buffer.from(text, "base64");
      text = buf.toString("utf-8");
    } catch {
      // keep original
    }
  }

  return { mimeType, text };
}

function pickUsefulHeaders(headersObj) {
  // Keep things that help replay/understand the call; drop noisy ones.
  const keep = new Set([
    "accept",
    "content-type",
    "x-requested-with",
    "origin",
    "referer",
    "user-agent",
  ]);

  const out = {};
  for (const [k, v] of Object.entries(headersObj)) {
    if (keep.has(k.toLowerCase())) out[k] = v;
  }
  return out;
}

function writeFixture({ outDir, index, entry, opts }) {
  const method = entry.request.method;
  const url = entry.request.url;

  const reqHeaders = headerListToObject(entry.request.headers);
  const resHeaders = headerListToObject(entry.response.headers);

  const cleanedReqHeaders = opts.stripSecrets ? stripSecretHeaders(reqHeaders) : reqHeaders;
  const cleanedResHeaders = opts.stripSecrets ? stripSecretHeaders(resHeaders) : resHeaders;

  const reqBody = decodePostData(entry);
  const resBody = decodeResponseBody(entry);

  const urlObj = new URL(url);
  const baseName = `${method}-${urlObj.pathname}`.replace(/\/+$/, "") || method;
  const slug = safeSlug(baseName);
  const uniq = hashShort(`${method}|${url}|${entry.startedDateTime || index}`);
  const fileStem = `${String(index).padStart(3, "0")}-${slug}-${uniq}`;

  // Response body handling:
  // For readability + sane git diffs, always write response bodies to a sidecar file
  // (JSON -> .response.json, everything else -> .response.txt) and reference it from YAML.
  const responseMime = (entry.response.content?.mimeType ?? resBody?.mimeType ?? "").toLowerCase();
  const hasResponseText = typeof resBody?.text === "string" && resBody.text.length > 0;

  // Heuristic: treat as JSON if mimeType says JSON OR body starts with { or [
  const isJsonResponse =
    responseMime.includes("application/json") ||
    (hasResponseText && (resBody.text.trim().startsWith("{") || resBody.text.trim().startsWith("[")));

  const responseBodyFile = opts.includeBody && hasResponseText
    ? `${fileStem}.response.${isJsonResponse ? "json" : "txt"}`
    : null;

  // Helpful warning when HAR was not exported "with content"
  if (opts.includeBody && !hasResponseText) {
    console.warn(`[WARN] No response body content found in HAR for ${method} ${url}. Did you export \"HAR with content\"?`);
  }

  const fixture = {
    id: fileStem,
    meta: {
      startedDateTime: entry.startedDateTime,
      timeMs: entry.time,
      resourceType: entry._resourceType ?? null,
    },
    request: {
      method,
      url,
      query: Object.fromEntries(urlObj.searchParams.entries()),
      headers: pickUsefulHeaders(cleanedReqHeaders),
      body: reqBody,
    },
    response: {
      status: entry.response.status,
      statusText: entry.response.statusText,
      mimeType: entry.response.content?.mimeType ?? resBody?.mimeType ?? null,
      headers: pickUsefulHeaders(cleanedResHeaders),
      body: responseBodyFile ? { file: responseBodyFile } : null,
    },
  };

  // Write YAML
  const yamlText = YAML.stringify(fixture, { indent: 2 });
  fs.writeFileSync(path.join(outDir, `${fileStem}.yml`), yamlText, "utf-8");

  // Write response body file (always, when present)
  if (fixture.response.body?.file && resBody?.text) {
    fs.writeFileSync(path.join(outDir, fixture.response.body.file), resBody.text, "utf-8");
  }

  return { fileStem, url };
}

function main() {
  const args = parseArgs(process.argv);
  const harRaw = fs.readFileSync(args.harPath, "utf-8");
  const har = JSON.parse(harRaw);

  const entries = har?.log?.entries ?? [];
  const xhrEntries = entries.filter(isTargetDatarideIframe);

  ensureDir(args.outDir);

  const manifest = [];
  let n = 0;

  for (const entry of xhrEntries) {
    n++;
    const info = writeFixture({
      outDir: args.outDir,
      index: n,
      entry,
      opts: args,
    });
    manifest.push(info);
  }

  fs.writeFileSync(
    path.join(args.outDir, `manifest.json`),
    JSON.stringify(
      {
        sourceHar: path.resolve(args.harPath),
        createdAt: new Date().toISOString(),
        totalEntries: entries.length,
        xhrEntries: xhrEntries.length,
        fixtures: manifest,
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log(`Wrote ${xhrEntries.length} fixture(s) to ${args.outDir}`);
}

main();
