'use client';

import { Fragment, ReactNode, useEffect, useState } from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Dialog = ({
  open,
  onClose,
  title,
  children,
  maxWidth = 'md',
}: DialogProps) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    return null;
  }

  const dialogContent = (
    <Transition appear show={open} as={Fragment}>
      <HeadlessDialog 
        as="div" 
        className="relative z-[9999]"
        style={{ position: 'relative', zIndex: 9999 }}
        onClose={onClose}
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div 
            className="fixed inset-0 bg-black/75"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', position: 'fixed', inset: 0, zIndex: 9998 }}
            onClick={(e) => {
              e.stopPropagation();
              // Don't close on backdrop click
            }}
          />
        </Transition.Child>

        {/* Dialog Panel */}
        <div className="fixed inset-0 overflow-y-auto" style={{ position: 'fixed', inset: 0, overflowY: 'auto', zIndex: 9999 }}>
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <HeadlessDialog.Panel
                className={`w-full ${maxWidthClasses[maxWidth]} transform overflow-hidden rounded-lg bg-background border border-primary/30 p-6 text-left align-middle shadow-xl transition-all`}
              >
                {/* Header */}
                {title && (
                  <div className="flex items-center justify-between mb-4">
                    <HeadlessDialog.Title
                      as="h3"
                      className="text-lg font-medium text-foreground"
                    >
                      {title}
                    </HeadlessDialog.Title>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClose();
                      }}
                      className="text-foreground/50 hover:text-foreground transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Content */}
                <div className="mt-2">{children}</div>
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );

  return createPortal(dialogContent, modalRoot);
};
