import { setTimeout as delay } from "timers/promises";

import { BASE_URL } from "./constants";

const MIN_DELAY_MS = 300;
const MAX_DELAY_MS = 500;
const MAX_RETRIES = 4;
const BACKOFF_BASE_MS = 500;
const DEFAULT_REFERER = `${BASE_URL}/iframe/`;
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const waitFor = elapsed >= MIN_DELAY_MS ? 0 : MIN_DELAY_MS - elapsed;

  if (waitFor > 0) {
    await delay(waitFor);
  }

  lastRequestTime = Date.now();
}

function encodeForm(form: Record<string, string | number | undefined | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(form)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  return params.toString();
}

function debugLog(message: string, payload?: unknown) {
  if (process.env.DATARIDE_DEBUG) {
    // eslint-disable-next-line no-console
    console.debug(`[dataride] ${message}`, payload ?? "");
  }
}

async function requestJson(
  method: "GET" | "POST",
  url: string,
  body?: string,
  attempt = 0,
): Promise<any> {
  await rateLimit();

  const headers: Record<string, string> = {
    Accept: "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest",
  };

  headers.Origin = BASE_URL;
  headers.Referer = DEFAULT_REFERER;
  headers["Accept-Language"] = "en-US,en;q=0.9";
  headers["User-Agent"] = DEFAULT_USER_AGENT;

  if (method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
  }

  if (process.env.DATARIDE_COOKIE) {
    headers.Cookie = process.env.DATARIDE_COOKIE;
  }

  debugLog(`${method} ${url}`, body);

  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  if (response.status >= 500 || response.status === 429) {
    if (attempt >= MAX_RETRIES) {
      throw new Error(`Dataride request failed after retries: ${response.status}`);
    }

    const backoff = BACKOFF_BASE_MS * 2 ** attempt + Math.random() * MAX_DELAY_MS;
    debugLog(`Retrying ${url} after ${backoff}ms due to status ${response.status}`);
    await delay(backoff);
    return requestJson(method, url, body, attempt + 1);
  }

  const rawBody = await response.text();
  if (!response.ok) {
    throw new Error(
      `Dataride request failed: ${response.status} ${
        response.statusText
      } - ${rawBody.slice(0, 200)}`,
    );
  }

  const trimmed = rawBody.trim();
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("json") && trimmed.startsWith("<")) {
    throw new Error(
      `Dataride returned HTML instead of JSON. Response snippet: ${trimmed.slice(0, 200)}`,
    );
  }

  try {
    const json = trimmed ? JSON.parse(trimmed) : null;
    debugLog(`Response from ${url}`, json);
    return json;
  } catch (error) {
    throw new Error(
      `Failed to parse Dataride JSON for ${url}: ${
        error instanceof Error ? error.message : String(error)
      } - ${trimmed.slice(0, 200)}`,
    );
  }
}

export async function getJson(path: string): Promise<any> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  return requestJson("GET", url);
}

export async function postForm(
  path: string,
  form: Record<string, string | number | undefined | null>,
): Promise<any> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const body = encodeForm(form);
  return requestJson("POST", url, body);
}
