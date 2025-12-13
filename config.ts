
/**
 * Global Configuration Strategy
 */

export const CONFIG = {
  // Application
  APP_NAME: 'easyMO Discovery',
  VERSION: '2.0.0-secure',

  // Backend Endpoints
  // We use Google Apps Script (GAS) as a lightweight serverless backend
  // REPLACE THIS URL with your specific deployed Web App URL if different
  BACKEND_URL: "https://script.google.com/macros/s/AKfycbwz5dainA_f7SPKxLBvlN7yDuP53ZPyQOxVRXkbxrMpLOFy-52unhxy94VTcr7qX_yO/exec",
  
  // Feature Flags
  ENABLE_REAL_PRESENCE: true, // Now strictly true via Backend
  ENABLE_DEMO_MODE: false, 
};

export const getBackendUrl = () => CONFIG.BACKEND_URL;
