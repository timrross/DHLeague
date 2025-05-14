import React, { useEffect } from 'react';

interface AdProviderProps {
  children: React.ReactNode;
}

// This component initializes the Google AdSense script globally
// We do this at the layout level so it's available throughout the app
export default function AdProvider({ children }: AdProviderProps) {
  // Your AdSense client ID - would typically come from environment variables
  const googleAdClient = 'ca-pub-xxxxxxxxxxxxxxxx'; // Replace with your actual client ID

  useEffect(() => {
    // Only add script in production to avoid development console errors
    if (process.env.NODE_ENV === 'production') {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${googleAdClient}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);

      return () => {
        // Cleanup function
        try {
          document.head.removeChild(script);
        } catch (e) {
          console.error('Error removing AdSense script:', e);
        }
      };
    }
  }, [googleAdClient]);

  return <>{children}</>;
}