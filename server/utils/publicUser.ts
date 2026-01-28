import type { PublicUser, User } from "@shared/schema";

const getEmailPrefix = (email?: string | null) => {
  if (!email) return "";
  return email.split("@")[0] ?? "";
};

export const buildPublicUser = (user: User): PublicUser => {
  const username = user.username?.trim() || null;
  const fallback = getEmailPrefix(user.email) || "Anonymous";
  return {
    id: user.id,
    username,
    displayName: username ?? fallback,
  };
};

export const buildAnonymousPublicUser = (id: string): PublicUser => ({
  id,
  username: null,
  displayName: "Anonymous",
});
