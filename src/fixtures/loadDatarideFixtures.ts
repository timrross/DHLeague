import fs from "fs/promises";
import path from "path";
import YAML from "yaml";

export type LoadedDatarideFixture = {
  fixtureId: string;
  sourceDir: string;
  method: string;
  url: string;
  normalizedPath: string;
  bodyData?: Record<string, string>;
  bodyText?: string;
  startedDateTime?: string;
  responseJson?: unknown;
};

const BASE_FIXTURES_DIR = path.resolve(
  process.cwd(),
  "docs/api/dataride",
);

function normalizePath(value: string) {
  if (!value) return value;
  try {
    const parsed = new URL(value);
    return parsed.pathname + parsed.search;
  } catch {
    return value.startsWith("/") ? value : `/${value}`;
  }
}

async function loadManifest(manifestPath: string) {
  const raw = await fs.readFile(manifestPath, "utf8");
  return JSON.parse(raw) as { fixtures?: Array<{ fileStem?: string; id?: string }> };
}

async function loadResponseJson(fixturesDir: string, fileName?: string) {
  if (!fileName || !fileName.endsWith(".json")) {
    return undefined;
  }

  const responsePath = path.join(fixturesDir, fileName);
  const data = await fs.readFile(responsePath, "utf8");
  return JSON.parse(data);
}

function parseBodyData(
  bodyData: unknown,
): Record<string, string> | undefined {
  if (!bodyData || typeof bodyData !== "object") return undefined;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(bodyData)) {
    const normalizedKey =
      typeof key === "string" && key.includes("%")
        ? decodeURIComponent(key)
        : key;
    if (typeof value === "string") {
      result[normalizedKey] = value;
    } else if (
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      result[normalizedKey] = String(value);
    }
  }
  return Object.keys(result).length ? result : undefined;
}

async function loadFixturesFromDirectory(dir: string) {
  const manifestPath = path.join(dir, "manifest.json");
  const stat = await fs.stat(manifestPath).catch(() => null);
  if (!stat) return [] as LoadedDatarideFixture[];

  const manifest = await loadManifest(manifestPath);
  const fixtures: LoadedDatarideFixture[] = [];

  for (const entry of manifest.fixtures ?? []) {
    const fileStem = entry.fileStem ?? entry.id;
    if (!fileStem) continue;

    const yamlPath = path.join(dir, `${fileStem}.yml`);
    const yamlStat = await fs.stat(yamlPath).catch(() => null);
    if (!yamlStat) continue;

    const yamlContent = await fs.readFile(yamlPath, "utf8");
    const parsed = YAML.parse(yamlContent) as {
      id?: string;
      request?: {
        method?: string;
        url?: string;
        body?: { data?: Record<string, unknown>; text?: string };
      };
      meta?: { startedDateTime?: string };
      response?: { body?: { file?: string } };
    };

    const method = (parsed?.request?.method ?? "GET").toUpperCase();
    const url = parsed?.request?.url ?? "";
    const normalizedPath = normalizePath(url);
    const responseJson = await loadResponseJson(
      dir,
      parsed?.response?.body?.file,
    );

    fixtures.push({
      fixtureId: parsed?.id ?? fileStem,
      sourceDir: dir,
      method,
      url,
      normalizedPath,
      bodyData: parseBodyData(parsed?.request?.body?.data),
      bodyText:
        typeof parsed?.request?.body?.text === "string"
          ? parsed?.request?.body?.text
          : undefined,
      startedDateTime: parsed?.meta?.startedDateTime,
      responseJson,
    });
  }

  return fixtures;
}

async function discoverFixtureDirectories(baseDir: string) {
  const dirs: string[] = [];
  const baseStat = await fs.stat(baseDir).catch(() => null);
  if (!baseStat) return dirs;

  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("fixtures")) {
      dirs.push(path.join(baseDir, entry.name));
    }
  }
  return dirs;
}

export async function loadDatarideFixtures(options?: {
  dirs?: string[];
}): Promise<LoadedDatarideFixture[]> {
  const dirs =
    options?.dirs ?? (await discoverFixtureDirectories(BASE_FIXTURES_DIR));
  const allFixtures: LoadedDatarideFixture[] = [];
  for (const dir of dirs) {
    const loaded = await loadFixturesFromDirectory(dir);
    allFixtures.push(...loaded);
  }

  allFixtures.sort((a, b) => {
    const aTime = a.startedDateTime ? Date.parse(a.startedDateTime) : 0;
    const bTime = b.startedDateTime ? Date.parse(b.startedDateTime) : 0;
    return aTime - bTime;
  });

  return allFixtures;
}
