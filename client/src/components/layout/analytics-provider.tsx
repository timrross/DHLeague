import React, { useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  buildCurrentPageViewPayload,
  getAnalyticsConfig,
  trackLinkClick,
} from "@/lib/analytics";

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

const GA4_SCRIPT_ID = "ga4-script";
const { measurementId, isEnabled } = getAnalyticsConfig();

function addGa4Script(id: string) {
  if (document.getElementById(GA4_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.id = GA4_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);
}

function initGa4(id: string) {
  window.dataLayer = window.dataLayer ?? [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer?.push(arguments);
    };
  }
  window.gtag("js", new Date());
  window.gtag("config", id, { send_page_view: false });
}

export default function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const [location] = useLocation();
  const hasInitialized = useRef(false);
  const lastPagePath = useRef<string | null>(null);

  const sendPageView = useCallback(() => {
    if (!isEnabled) {
      return;
    }

    const schedule =
      typeof window !== "undefined" && "requestAnimationFrame" in window
        ? window.requestAnimationFrame
        : (callback: FrameRequestCallback) => window.setTimeout(callback, 0);

    schedule(() => {
      const payload = buildCurrentPageViewPayload();
      if (!payload.page_path || payload.page_path === lastPagePath.current) {
        return;
      }

      lastPagePath.current = payload.page_path;
      window.gtag?.("event", "page_view", payload);
    });
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled || !measurementId || hasInitialized.current) {
      return;
    }

    addGa4Script(measurementId);
    initGa4(measurementId);
    hasInitialized.current = true;
  }, [isEnabled, measurementId]);

  useEffect(() => {
    if (!isEnabled || !measurementId) {
      return;
    }

    if (!hasInitialized.current) {
      addGa4Script(measurementId);
      initGa4(measurementId);
      hasInitialized.current = true;
    }
    sendPageView();
  }, [location, isEnabled, measurementId, sendPageView]);

  useEffect(() => {
    if (!isEnabled || !measurementId) {
      return;
    }

    const handleUrlChange = () => {
      if (!hasInitialized.current) {
        addGa4Script(measurementId);
        initGa4(measurementId);
        hasInitialized.current = true;
      }
      sendPageView();
    };

    window.addEventListener("hashchange", handleUrlChange);
    window.addEventListener("popstate", handleUrlChange);

    return () => {
      window.removeEventListener("hashchange", handleUrlChange);
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, [isEnabled, measurementId, sendPageView]);

  useEffect(() => {
    if (!isEnabled || !measurementId) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a");
      if (!anchor) return;
      if (anchor.dataset.analyticsSkip === "true") return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      trackLinkClick(href);
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [isEnabled, measurementId]);

  return <>{children}</>;
}
