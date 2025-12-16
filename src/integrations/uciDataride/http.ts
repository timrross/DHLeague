import { setTimeout as delay } from "timers/promises";

import { BASE_URL } from "./constants";

const MIN_DELAY_MS = 300;
const MAX_DELAY_MS = 500;
const MAX_RETRIES = 4;
const BACKOFF_BASE_MS = 500;

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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dataride request failed: ${response.status} ${text}`);
  }

  const json = await response.json();
  debugLog(`Response from ${url}`, json);
  return json;
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
