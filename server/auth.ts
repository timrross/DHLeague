import expressOpenIdConnect from "express-openid-connect";
import type { ConfigParams } from "express-openid-connect";
const { auth, requiresAuth } = expressOpenIdConnect;
import type { Express, Request, Response } from "express";
import { storage } from "./storage";

function requireEnv(name: string, value?: string) {
  if (!value) {
    throw new Error(`Environment variable ${name} not provided`);
  }
  return value;
}

const issuerBaseURL = requireEnv(
  "OIDC_ISSUER_URL",
  process.env.OIDC_ISSUER_URL ?? process.env.ISSUER_URL,
);
const clientID = requireEnv("OIDC_CLIENT_ID", process.env.OIDC_CLIENT_ID);
const sessionSecret = requireEnv("SESSION_SECRET", process.env.SESSION_SECRET);

const rawBaseURL =
  process.env.AUTH_BASE_URL ??
  process.env.PUBLIC_BASE_URL ??
  `http://localhost:${process.env.LOCALHOST_CALLBACK_PORT ?? "5001"}`;

function normalizeBaseURL(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.origin;
  } catch {
    return value.replace(/\/+$/, "");
  }
}

const baseURL = normalizeBaseURL(rawBaseURL);

const clientSecret = process.env.OIDC_CLIENT_SECRET;
const scope =
  process.env.OIDC_SCOPE ?? "openid profile email offline_access";

const publicAuthPath = process.env.AUTH_PUBLIC_PATH ?? "/api/auth";

const authConfig: ConfigParams = {
  authRequired: false,
  auth0Logout: true,
  idpLogout: true,
  secret: sessionSecret,
  baseURL,
  clientID,
  issuerBaseURL,
  clientSecret,
  authorizationParams: {
    response_type: "code",
    scope,
    audience: process.env.OIDC_AUDIENCE,
  },
  routes: {
    login: `${publicAuthPath}/login`,
    logout: `${publicAuthPath}/logout`,
    callback: `${publicAuthPath}/callback`,
    postLogoutRedirect: "/",
  },
  afterCallback: async (_req: Request, _res: Response, session) => session,
};

const requireAuthMiddleware = requiresAuth();

export function setupAuth(app: Express) {
  app.use(auth(authConfig));
}

export const requireAuth = requireAuthMiddleware;
