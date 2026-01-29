export interface PageViewInput {
  pathname: string;
  search?: string;
  hash?: string;
  title?: string;
  origin?: string;
}

export interface PageViewPayload {
  page_path: string;
  page_location: string;
  page_title?: string;
}

export type LinkClickEventName = "navigation_click" | "outbound_click";

export interface LinkClickEvent {
  eventName: LinkClickEventName;
  params: {
    link_url: string;
    link_domain: string;
    link_path: string;
    outbound: boolean;
    source_path: string;
  };
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export const buildPagePath = ({ pathname, search, hash }: PageViewInput) => {
  const safeSearch = search ?? "";
  const safeHash = hash ?? "";
  return `${pathname}${safeSearch}${safeHash}`;
};

export const buildPageViewPayload = ({
  pathname,
  search,
  hash,
  title,
  origin,
}: PageViewInput): PageViewPayload => {
  const page_path = buildPagePath({ pathname, search, hash });
  const page_location = origin ? `${origin}${page_path}` : page_path;
  const payload: PageViewPayload = {
    page_path,
    page_location,
  };

  if (title) {
    payload.page_title = title;
  }

  return payload;
};

export const getLinkClickEvent = ({
  href,
  origin,
  sourcePath,
}: {
  href: string;
  origin: string;
  sourcePath: string;
}): LinkClickEvent | null => {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed, origin);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return null;
  }

  const link_path = url.pathname;
  const link_url = `${url.origin}${link_path}`;
  const outbound = url.origin !== origin;

  return {
    eventName: outbound ? "outbound_click" : "navigation_click",
    params: {
      link_url,
      link_domain: url.hostname,
      link_path,
      outbound,
      source_path: sourcePath,
    },
  };
};
