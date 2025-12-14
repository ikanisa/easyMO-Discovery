import React from 'react';

interface AppFrameProps {
  children: React.ReactNode;
}

/**
 * AppFrame: The core container that enforces a mobile-like canvas on desktop.
 * 
 * This component:
 * 1. Centers the app content on wide screens
 * 2. Constrains max width to mobile prototype size (448px)
 * 3. Provides the background context for the entire app
 * 4. Acts as the positioning context for all fixed/absolute children
 * 
 * All fixed elements (nav, overlays, prompts) should be positioned relative
 * to this frame, not the viewport, to maintain prototype parity on desktop.
 */
const AppFrame: React.FC<AppFrameProps> = ({ children }) => {
  return (
    <div 
      className="min-h-screen w-full"
      style={{ 
        display: 'flex', 
        justifyContent: 'center',
        backgroundColor: '#000' // Pure black background for desktop sides
      }}
    >
      {/* 
        The inner container is the "phone frame" - 
        positioned relative so fixed children can reference it via CSS
      */}
      <div 
        id="app-frame" 
        className="w-full min-h-screen relative shadow-2xl"
        style={{ 
          maxWidth: '448px',
          backgroundColor: '#0f172a' // slate-900
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default AppFrame;
