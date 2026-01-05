
import React from 'react';
import { Drawer } from 'vaul';
import { cn } from '../../utils/ui';

interface MobileSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
}

export const MobileSheet: React.FC<MobileSheetProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  trigger
}) => {
  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange} shouldScaleBackground>
      {trigger && <Drawer.Trigger asChild>{trigger}</Drawer.Trigger>}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex flex-col rounded-t-[2rem] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/5 outline-none focus:ring-0">
          <div className="flex-1 rounded-t-[2rem] bg-inherit p-4 pt-2">
            <div className="mx-auto mb-6 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700" />
            
            <div className="mx-auto max-w-md">
              {(title || description) && (
                <div className="mb-6 px-2">
                  {title && <Drawer.Title className="text-xl font-black text-slate-900 dark:text-white">{title}</Drawer.Title>}
                  {description && <Drawer.Description className="mt-1 text-sm text-slate-500">{description}</Drawer.Description>}
                </div>
              )}
              {children}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
