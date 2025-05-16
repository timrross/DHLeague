import React, { useEffect } from "react";

interface AdProviderProps {
  children: React.ReactNode;
}

// This component initializes the Google AdSense script globally
// We do this at the layout level so it's available throughout the app
export default function AdProvider({ children }: AdProviderProps) {
  // Use our environment variable for the AdSense client ID
  const googleAdClient = process.env.GOOGLE_ADSENSE_CLIENT_ID;

  useEffect(() => {
    // Only add script in production to avoid development console errors
    if (import.meta.env.PROD) {
      const script = document.createElement("script");
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${googleAdClient}`;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);

      return () => {
        // Cleanup function
        try {
          document.head.removeChild(script);
        } catch (e) {
          console.error("Error removing AdSense script:", e);
        }
      };
    }
  }, [googleAdClient]);

  return <>{children}</>;
}
