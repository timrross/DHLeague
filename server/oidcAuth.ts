import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

function requireEnv(name: string, value?: string) {
  if (!value) {
    throw new Error(`Environment variable ${name} not provided`);
  }
  return value;
}

const issuerUrl = requireEnv(
  "OIDC_ISSUER_URL",
  process.env.OIDC_ISSUER_URL ?? process.env.ISSUER_URL,
);
const clientId = requireEnv("OIDC_CLIENT_ID", process.env.OIDC_CLIENT_ID);
const clientSecret = process.env.OIDC_CLIENT_SECRET;
const authDomains = requireEnv("AUTH_DOMAINS", process.env.AUTH_DOMAINS);
const parsedAuthDomains = authDomains
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (parsedAuthDomains.length === 0) {
  throw new Error("Environment variable AUTH_DOMAINS must list at least one domain");
}

const getOidcConfig = memoize(
  async () => {
    const metadata = clientSecret
      ? { client_secret: clientSecret }
      : undefined;
    return await client.discovery(new URL(issuerUrl), clientId, metadata);
  },
  { maxAge: 3600 * 1000 }
);

const callbackUrlOverride = process.env.OIDC_CALLBACK_URL;
const authRouterPrefix = process.env.AUTH_ROUTER_PREFIX ?? "/auth";
const authRouterLoginPath = `${authRouterPrefix}/login`;
const authRouterCallbackPath = `${authRouterPrefix}/callback`;
const authRouterLogoutPath = `${authRouterPrefix}/logout`;
const authPublicBasePath = process.env.AUTH_PUBLIC_PATH ?? "/api/auth";
const devCallbackPort = process.env.LOCALHOST_CALLBACK_PORT ??
  process.env.DEV_AUTH_CALLBACK_PORT ??
  process.env.PORT ??
  "5001";
const localCallbackHosts = new Set(["localhost", "127.0.0.1"]);
const authCallbackPath = `${authPublicBasePath}/callback`;

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const getCallbackUrl = (domain: string) => {
    if (callbackUrlOverride) {
      return callbackUrlOverride;
    }
    if (localCallbackHosts.has(domain)) {
      return `http://${domain}:${devCallbackPort}${authCallbackPath}`;
    }
    return `https://${domain}${authCallbackPath}`;
  };

  for (const domain of parsedAuthDomains) {
    const strategy = new Strategy(
      {
        name: `oidc:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: getCallbackUrl(domain),
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  const loginHandler: RequestHandler = (req, res, next) => {
    passport.authenticate(`oidc:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  };

  app.get(authRouterLoginPath, loginHandler);

  app.get(authRouterCallbackPath, (req, res, next) => {
    passport.authenticate(`oidc:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: authRouterLoginPath,
    })(req, res, next);
  });

  app.get(authRouterLogoutPath, (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: clientId,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.redirect(authRouterLoginPath);
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.redirect(authRouterLoginPath);
  }
};
