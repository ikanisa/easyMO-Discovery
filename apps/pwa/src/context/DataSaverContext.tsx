/**
 * Data Saver Context
 * Provides global data saver mode state and utilities
 * Reduces data usage by disabling autoplay, reducing image quality, and minimizing payloads
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DataSaverContextType {
  isEnabled: boolean;
  toggle: () => void;
  shouldReduceImages: boolean;
  shouldDisableAutoplay: boolean;
  shouldMinimizePayloads: boolean;
}

const DataSaverContext = createContext<DataSaverContextType | undefined>(undefined);

export const DataSaverProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState(() => {
    // Load from localStorage, default to false
    const saved = localStorage.getItem('easymo_data_saver');
    return saved === 'true';
  });

  useEffect(() => {
    // Save to localStorage when changed
    localStorage.setItem('easymo_data_saver', String(isEnabled));
  }, [isEnabled]);

  const toggle = () => {
    setIsEnabled(prev => !prev);
  };

  const value: DataSaverContextType = {
    isEnabled,
    toggle,
    shouldReduceImages: isEnabled,
    shouldDisableAutoplay: isEnabled,
    shouldMinimizePayloads: isEnabled,
  };

  return (
    <DataSaverContext.Provider value={value}>
      {children}
    </DataSaverContext.Provider>
  );
};

export const useDataSaver = (): DataSaverContextType => {
  const context = useContext(DataSaverContext);
  if (context === undefined) {
    throw new Error('useDataSaver must be used within a DataSaverProvider');
  }
  return context;
};

