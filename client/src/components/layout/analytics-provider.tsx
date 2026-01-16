import React, { useEffect, useRef } from "react";
import { useLocation } from "wouter";

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

const GA4_SCRIPT_ID = "ga4-script";
const measurementId = import.meta.env.VITE_GA4_MEASUREMENT_ID;

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
  const isEnabled = import.meta.env.PROD && Boolean(measurementId);

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

    window.gtag?.("event", "page_view", {
      page_path: location,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location, isEnabled, measurementId]);

  return <>{children}</>;
}
