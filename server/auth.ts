import { auth, requiresAuth } from "express-openid-connect";
import type { ConfigParams } from "express-openid-connect";
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
const baseURL =
  process.env.AUTH_BASE_URL ??
  process.env.PUBLIC_BASE_URL ??
  `http://localhost:${process.env.LOCALHOST_CALLBACK_PORT ?? "5001"}`;

const clientSecret = process.env.OIDC_CLIENT_SECRET;
const scope =
  process.env.OIDC_SCOPE ?? "openid profile email offline_access";

const authRoutesBase = process.env.AUTH_PUBLIC_PATH ?? "/api/auth";

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
    login: `${authRoutesBase}/login`,
    logout: `${authRoutesBase}/logout`,
    callback: `${authRoutesBase}/callback`,
    postLogoutRedirect: "/",
  },
  afterCallback: async (_req: Request, _res: Response, session) => {
    const user = session.user;
    if (user?.sub) {
      await storage.upsertUser({
        id: user.sub,
        email: user.email,
        firstName: user.given_name ?? user.name?.split?.(" ")?.[0],
        lastName: user.family_name ?? user.name?.split?.(" ")?.slice(1).join(" "),
        profileImageUrl: (user as Record<string, any>)["picture"],
      });
    }
    return session;
  },
};

const requireAuthMiddleware = requiresAuth();

export function setupAuth(app: Express) {
  app.use(auth(authConfig));
}

export const requireAuth = requireAuthMiddleware;
