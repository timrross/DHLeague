import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

<<<<<<< HEAD:server/replitAuth.ts
=======
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
const authDomains = requireEnv("AUTH_DOMAINS", process.env.AUTH_DOMAINS);
const parsedAuthDomains = authDomains
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (parsedAuthDomains.length === 0) {
  throw new Error("Environment variable AUTH_DOMAINS must list at least one domain");
}

>>>>>>> be6bffa120e7dd4019f31dd43b89e1a860bb1767:server/oidcAuth.ts
const getOidcConfig = memoize(
  async () => {
    return await client.discovery(new URL(issuerUrl), clientId);
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
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

<<<<<<< HEAD:server/replitAuth.ts
  const strategy = new Strategy(
    {
      name: "replitauth",
      config,
      scope: "openid email profile offline_access",
      callbackURL: process.env.OIDC_CALLBACK_URL ?? "/api/callback",
    },
    verify,
  );
  passport.use(strategy);
=======
  for (const domain of parsedAuthDomains) {
    const strategy = new Strategy(
      {
        name: `oidc:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }
>>>>>>> be6bffa120e7dd4019f31dd43b89e1a860bb1767:server/oidcAuth.ts

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
<<<<<<< HEAD:server/replitAuth.ts
    passport.authenticate("replitauth", {
=======
    passport.authenticate(`oidc:${req.hostname}`, {
>>>>>>> be6bffa120e7dd4019f31dd43b89e1a860bb1767:server/oidcAuth.ts
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
<<<<<<< HEAD:server/replitAuth.ts
    passport.authenticate("replitauth", {
=======
    passport.authenticate(`oidc:${req.hostname}`, {
>>>>>>> be6bffa120e7dd4019f31dd43b89e1a860bb1767:server/oidcAuth.ts
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
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
    return res.redirect("/api/login");
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.redirect("/api/login");
  }
};
