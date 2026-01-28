import type { Express } from "express";
import { once } from "node:events";
import { AddressInfo } from "node:net";

export type TestResponse<T = unknown> = {
  status: number;
  body: T;
};

async function performRequest<T>(
  app: Express,
  method: string,
  path: string,
  body?: unknown,
): Promise<TestResponse<T>> {
  const server = app.listen(0);
  await once(server, "listening");
  const address = server.address() as AddressInfo | null;

  if (!address || typeof address.port !== "number") {
    server.close();
    throw new Error("Unable to determine test server port");
  }

  const url = `http://127.0.0.1:${address.port}${path}`;

  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let parsed: any = text;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      // Leave as raw text when JSON parsing fails
    }

    return { status: response.status, body: parsed };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

export default function request(app: Express) {
  return {
    get: <T = unknown>(path: string) => performRequest<T>(app, "GET", path),
    post: <T = unknown>(path: string, body?: unknown) =>
      performRequest<T>(app, "POST", path, body),
    put: <T = unknown>(path: string, body?: unknown) =>
      performRequest<T>(app, "PUT", path, body),
    delete: <T = unknown>(path: string) => performRequest<T>(app, "DELETE", path),
  };
}
