/**
 * PWA-specific constants
 * Most constants are now in @easymo/shared
 */

// Re-export shared constants
export { ICONS, ROLES, VEHICLE_TYPES, AGENT_TYPES, DEFAULT_LOCATION, DEFAULT_RADIUS_KM } from '@easymo/shared/constants';

// PWA-specific icon components (React components)
import React from 'react';

const createIcon = (paths: React.ReactNode[]) => (props: React.SVGProps<SVGSVGElement>) => 
  React.createElement('svg', { 
    fill: "none", 
    viewBox: "0 0 24 24", 
    strokeWidth: 1.5, 
    stroke: "currentColor", 
    ...props 
  }, ...paths);

// Export React icon components (keep existing ICONS object structure for compatibility)
export const ICON_COMPONENTS = {
  Home: createIcon([
    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25", key: "home" })
  ]),
  // Add more icon components as needed
} as const;
