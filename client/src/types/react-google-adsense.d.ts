declare module 'react-google-adsense' {
  import React from 'react';
  
  interface GoogleProps {
    client: string;
    slot: string;
    format?: string;
    responsive?: string;
    style?: React.CSSProperties;
    className?: string;
  }
  
  interface AdSenseInterface {
    Google: React.FC<GoogleProps>;
  }
  
  const AdSense: AdSenseInterface;
  
  export default AdSense;
}