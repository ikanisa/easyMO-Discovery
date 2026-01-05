/**
 * Drawer - Left navigation drawer for AI-first UI
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppMode } from '@easymo/shared/types';
import { ICONS } from '../../../constants';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: AppMode;
  onNavigate: (mode: AppMode) => void;
}

const DRAWER_ITEMS = [
  { mode: AppMode.HOME, label: 'Chat', icon: ICONS.Chat || ICONS.Home },
  { mode: AppMode.DISCOVERY, label: 'Discovery', icon: ICONS.Bike },
  { mode: AppMode.BUSINESS, label: 'Business', icon: ICONS.Store },
  { mode: AppMode.SERVICES, label: 'Services', icon: ICONS.Grid },
  { mode: AppMode.SETTINGS, label: 'Settings', icon: ICONS.Settings },
];

const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, currentMode, onNavigate }) => {
  const handleItemClick = (mode: AppMode) => {
    onNavigate(mode);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="
              fixed left-0 top-0 bottom-0 z-50
              w-72
              bg-white dark:bg-slate-900
              border-r border-slate-200 dark:border-slate-700
              shadow-2xl
            "
          >
            {/* Header */}
            <div className="
              flex items-center justify-between
              px-6 py-4
              border-b border-slate-200 dark:border-slate-700
            ">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                easyMO
              </h2>
              <button
                onClick={onClose}
                className="
                  p-2 rounded-lg
                  hover:bg-slate-100 dark:hover:bg-slate-800
                  text-slate-600 dark:text-slate-400
                "
              >
                <ICONS.XMark className="w-6 h-6" />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="px-4 py-4 space-y-2">
              {DRAWER_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = currentMode === item.mode;

                return (
                  <button
                    key={item.mode}
                    onClick={() => handleItemClick(item.mode)}
                    className={`
                      w-full
                      flex items-center gap-3
                      px-4 py-3
                      rounded-xl
                      transition-all
                      ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-white" />
                    )}
                  </button>
                );
              })}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Drawer;

