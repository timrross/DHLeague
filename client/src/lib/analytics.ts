import { buildPagePath, buildPageViewPayload, getLinkClickEvent } from "@shared/analytics";

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

type AnalyticsConfig = {
  measurementId?: string;
  isEnabled: boolean;
};

const analyticsConfig: AnalyticsConfig = {
  measurementId: import.meta.env.VITE_GA4_MEASUREMENT_ID,
  isEnabled: import.meta.env.PROD && Boolean(import.meta.env.VITE_GA4_MEASUREMENT_ID),
};

const hasWindow = () => typeof window !== "undefined";

export const getAnalyticsConfig = () => analyticsConfig;

export const getCurrentPagePath = () => {
  if (!hasWindow()) return "";
  return buildPagePath({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  });
};

export const buildCurrentPageViewPayload = () => {
  if (!hasWindow()) {
    return {
      page_path: "",
      page_location: "",
    };
  }
  return buildPageViewPayload({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    title: document.title,
    origin: window.location.origin,
  });
};

export const trackEvent = (name: string, params?: AnalyticsParams) => {
  if (!analyticsConfig.isEnabled || !hasWindow()) {
    return;
  }

  window.gtag?.("event", name, params ?? {});
};

export const trackPageView = () => {
  if (!analyticsConfig.isEnabled || !hasWindow()) {
    return null;
  }

  const payload = buildCurrentPageViewPayload();
  window.gtag?.("event", "page_view", payload);
  return payload;
};

export const trackLinkClick = (href: string) => {
  if (!analyticsConfig.isEnabled || !hasWindow()) {
    return;
  }

  const sourcePath = getCurrentPagePath();
  const event = getLinkClickEvent({
    href,
    origin: window.location.origin,
    sourcePath,
  });

  if (!event) return;
  trackEvent(event.eventName, event.params);
};
