import React, { useEffect, useState } from 'react';
import AdSense from 'react-google-adsense';

// Define the available ad formats
type AdFormat = 'auto' | 'horizontal' | 'vertical' | 'rectangle';

// Ad format dimensions based on Google AdSense standard formats
const formatStyles: Record<AdFormat, React.CSSProperties> = {
  auto: { display: 'block', width: '100%', height: 'auto' },
  horizontal: { display: 'inline-block', width: '728px', height: '90px', maxWidth: '100%' },
  vertical: { display: 'inline-block', width: '160px', height: '600px', maxWidth: '100%' },
  rectangle: { display: 'inline-block', width: '300px', height: '250px', maxWidth: '100%' }
};

// Default ad slots for different positions
export const adSlots = {
  leaderboard: 'x123456789', // For top of page
  sidebar: 'x234567890',     // For sidebar
  footer: 'x345678901'       // For footer/bottom of page
};

interface GoogleAdProps {
  client: string;           // Your AdSense client ID
  slot: string;             // Your AdSense ad unit ID
  format?: AdFormat;        // The ad format
  className?: string;       // Additional CSS classes
  responsive?: boolean;     // Whether to use responsive ads
  showLabel?: boolean;      // Show "Advertisement" label above the ad
}

export function GoogleAd({
  client,
  slot,
  format = 'auto',
  className = '',
  responsive = true,
  showLabel = true
}: GoogleAdProps) {
  const [adClient, setAdClient] = useState<string>('');
  
  // Check if we have the actual client ID or need to get it from environment
  useEffect(() => {
    // Use process.env for server-side env variables, but need to check if defined
    const envClient = process.env.REACT_APP_ADSENSE_CLIENT || 'ca-pub-xxxxxxxxxxxxxxxx';
    setAdClient(client || envClient);
  }, [client]);
  
  if (!adClient) return null;
  
  return (
    <div className={`ad-container my-4 ${className}`}>
      {showLabel && (
        <div className="text-xs text-muted-foreground uppercase mb-1 text-center">
          Advertisement
        </div>
      )}
      <div style={formatStyles[format]}>
        <AdSense.Google
          client={adClient}
          slot={slot}
          style={formatStyles[format]}
          responsive={responsive ? 'true' : 'false'}
          format={responsive ? 'auto' : 'rectangle'}
        />
      </div>
    </div>
  );
}

// Preset ad components for common placements
export function LeaderboardAd({ client, className = '', showLabel = true }: Omit<GoogleAdProps, 'slot' | 'format'>) {
  return (
    <GoogleAd
      client={client}
      slot={adSlots.leaderboard}
      format="horizontal"
      className={`max-w-screen-lg mx-auto ${className}`}
      responsive={true}
      showLabel={showLabel}
    />
  );
}

export function SidebarAd({ client, className = '', showLabel = true }: Omit<GoogleAdProps, 'slot' | 'format'>) {
  return (
    <GoogleAd
      client={client}
      slot={adSlots.sidebar}
      format="rectangle"
      className={`mb-6 ${className}`}
      responsive={false}
      showLabel={showLabel}
    />
  );
}

export function FooterAd({ client, className = '', showLabel = true }: Omit<GoogleAdProps, 'slot' | 'format'>) {
  return (
    <GoogleAd
      client={client}
      slot={adSlots.footer}
      format="horizontal"
      className={`max-w-screen-lg mx-auto mt-8 ${className}`}
      responsive={true}
      showLabel={showLabel}
    />
  );
}