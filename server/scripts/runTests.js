import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const TEST_DB_ENV = "TEST_DATABASE_URL";

const toPosixPath = (value) => value.split(path.sep).join(path.posix.sep);

const collectTestFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return await collectTestFiles(fullPath);
      }
      if (entry.isFile() && entry.name.endsWith(".test.ts")) {
        return [fullPath];
      }
      return [];
    }),
  );
  return files.flat();
};

const runCommand = (command, args, env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env,
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });

const testDbUrl = process.env[TEST_DB_ENV];
if (!testDbUrl) {
  console.error(`${TEST_DB_ENV} must be set to a dedicated test database.`);
  process.exit(1);
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL === testDbUrl) {
  console.warn(
    `${TEST_DB_ENV} matches DATABASE_URL. Ensure this is not a live database.`,
  );
}

const env = {
  ...process.env,
  DATABASE_URL: testDbUrl,
  NODE_ENV: "test",
};

const resetArgs = [path.join("server", "scripts", "dbReset.js")];

let exitCode = 1;
try {
  const resetCode = await runCommand(process.execPath, resetArgs, env);
  if (resetCode === 0) {
    const testFiles = await collectTestFiles(path.join(process.cwd(), "server"));
    if (testFiles.length === 0) {
      console.error("No test files found under server/.");
      exitCode = 1;
    } else {
      const tsxBin = path.resolve(
        process.cwd(),
        "node_modules",
        ".bin",
        process.platform === "win32" ? "tsx.cmd" : "tsx",
      );
      const args = ["--test", ...testFiles.map(toPosixPath)];
      exitCode = await runCommand(tsxBin, args, env);
    }
  } else {
    exitCode = resetCode;
  }
} finally {
  const cleanupCode = await runCommand(process.execPath, resetArgs, env).catch(
    (error) => {
      console.error("Failed to reset database after tests", error);
      return 1;
    },
  );
  if (exitCode === 0 && cleanupCode !== 0) {
    exitCode = cleanupCode;
  }
}

process.exit(exitCode);
