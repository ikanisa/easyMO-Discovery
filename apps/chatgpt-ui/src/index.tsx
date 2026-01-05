/**
 * ChatGPT UI Bundle
 * Minimal embedded UI for ChatGPT (iframe-safe)
 * Renders "cards" + key views
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

// Placeholder - will be implemented with card components
export function renderCard(type: string, data: any) {
  return <div>Card: {type}</div>;
}

// Entry point for iframe embedding
if (typeof window !== 'undefined') {
  const root = document.getElementById('root');
  if (root) {
    ReactDOM.createRoot(root).render(
      <div>ChatGPT UI Bundle</div>
    );
  }
}

