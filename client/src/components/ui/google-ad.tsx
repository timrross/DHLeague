import React from 'react';

// Define the available ad formats
type AdFormat = 'auto' | 'horizontal' | 'vertical' | 'rectangle';

// Simplified ad component to get the app running
// We'll replace this with proper AdSense integration once the app is stable
interface GoogleAdProps {
  client?: string;           // Your AdSense client ID
  slot?: string;             // Your AdSense ad unit ID
  format?: AdFormat;         // The ad format
  className?: string;        // Additional CSS classes
  responsive?: boolean;      // Whether to use responsive ads
  showLabel?: boolean;       // Show "Advertisement" label above the ad
}

// Default ad slots for different positions
export const adSlots = {
  leaderboard: 'x123456789', // For top of page
  sidebar: 'x234567890',     // For sidebar
  footer: 'x345678901'       // For footer/bottom of page
};

// Format dimensions based on standard ad sizes
const getFormatStyle = (format: AdFormat): React.CSSProperties => {
  switch (format) {
    case 'horizontal':
      return { width: '728px', height: '90px', maxWidth: '100%' };
    case 'vertical':
      return { width: '160px', height: '600px', maxWidth: '100%' };
    case 'rectangle':
      return { width: '300px', height: '250px', maxWidth: '100%' };
    case 'auto':
    default:
      return { width: '100%', height: 'auto', minHeight: '90px' };
  }
};

export function GoogleAd({
  client = '',
  slot = '',
  format = 'auto',
  className = '',
  showLabel = true
}: GoogleAdProps) {
  // Simplified ad placeholder
  return (
    <div className={`ad-container my-4 ${className}`}>
      {showLabel && (
        <div className="text-xs text-muted-foreground uppercase mb-1 text-center">
          Advertisement
        </div>
      )}
      <div 
        style={{
          ...getFormatStyle(format),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f1f1f1',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          color: '#666'
        }}
      >
        <div className="text-center p-4">
          <p className="text-sm">Ad Space</p>
          <p className="text-xs mt-1">Client: {client || '[Client ID]'}</p>
          <p className="text-xs">Slot: {slot || '[Slot ID]'}</p>
        </div>
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
      showLabel={showLabel}
    />
  );
}