'use client';

import { Fragment, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';
import { createPortal } from 'react-dom';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

const variantConfig: Record<
  ConfirmVariant,
  { icon: ReactNode; iconBg: string; confirmBg: string; confirmHover: string; glow: string }
> = {
  danger: {
    icon: <Trash2 className="w-6 h-6 text-red-400" />,
    iconBg: 'bg-red-500/10 border-red-500/30',
    confirmBg: 'bg-red-600 hover:bg-red-500',
    confirmHover: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]',
    glow: 'shadow-[0_0_60px_rgba(239,68,68,0.15)]',
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
    iconBg: 'bg-amber-500/10 border-amber-500/30',
    confirmBg: 'bg-amber-600 hover:bg-amber-500',
    confirmHover: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]',
    glow: 'shadow-[0_0_60px_rgba(245,158,11,0.15)]',
  },
  info: {
    icon: <Info className="w-6 h-6 text-cyan-400" />,
    iconBg: 'bg-cyan-500/10 border-cyan-500/30',
    confirmBg: 'bg-cyan-600 hover:bg-cyan-500',
    confirmHover: 'hover:shadow-[0_0_20px_rgba(0,217,255,0.4)]',
    glow: 'shadow-[0_0_60px_rgba(0,217,255,0.15)]',
  },
};

export const ConfirmDialog = ({
  open,
  onConfirm,
  onCancel,
  title = 'Potwierdzenie',
  message = 'Czy na pewno chcesz kontynuować?',
  confirmLabel = 'Potwierdź',
  cancelLabel = 'Anuluj',
  variant = 'danger',
}: ConfirmDialogProps) => {
  const [mounted, setMounted] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => confirmRef.current?.focus(), 100);
    }
  }, [open]);

  if (!mounted) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  const cfg = variantConfig[variant];

  const content = (
    <Transition appear show={open} as={Fragment}>
      <HeadlessDialog
        as="div"
        className="relative z-[99999]"
        style={{ position: 'relative', zIndex: 99999 }}
        onClose={onCancel}
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.80)',
              backdropFilter: 'blur(4px)',
              position: 'fixed',
              inset: 0,
              zIndex: 99998,
            }}
          />
        </Transition.Child>

        {/* Panel */}
        <div
          className="fixed inset-0 overflow-y-auto"
          style={{ position: 'fixed', inset: 0, overflowY: 'auto', zIndex: 99999 }}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-90"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-90"
            >
              <HeadlessDialog.Panel
                className={`w-full max-w-sm transform rounded-xl border border-primary/20 bg-[#0a0e1a] p-0 text-left shadow-2xl transition-all ${cfg.glow}`}
              >
                {/* Close button */}
                <button
                  type="button"
                  onClick={onCancel}
                  className="absolute top-3 right-3 text-foreground/40 hover:text-foreground/70 transition-colors z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center">
                  {/* Icon */}
                  <div
                    className={`w-14 h-14 rounded-full border flex items-center justify-center mb-4 ${cfg.iconBg}`}
                  >
                    {cfg.icon}
                  </div>

                  {/* Title */}
                  <HeadlessDialog.Title
                    as="h3"
                    className="text-lg font-semibold text-foreground mb-2"
                  >
                    {title}
                  </HeadlessDialog.Title>

                  {/* Message */}
                  <div className="text-sm text-foreground/60 leading-relaxed whitespace-pre-line">
                    {message}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 h-10 rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-foreground/70 hover:bg-white/10 hover:text-foreground transition-all"
                  >
                    {cancelLabel}
                  </button>
                  <button
                    ref={confirmRef}
                    type="button"
                    onClick={onConfirm}
                    className={`flex-1 h-10 rounded-lg text-sm font-medium text-white transition-all ${cfg.confirmBg} ${cfg.confirmHover}`}
                  >
                    {confirmLabel}
                  </button>
                </div>
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );

  return createPortal(content, modalRoot);
};

/* -------------------------------------------------------------------------- */
/*  useConfirm hook — promise-based replacement for window.confirm            */
/* -------------------------------------------------------------------------- */

interface ConfirmOptions {
  title?: string;
  message?: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: {},
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions = {}): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState({ open: false, options: {}, resolve: null });
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState({ open: false, options: {}, resolve: null });
  }, [state.resolve]);

  const ConfirmDialogElement = (
    <ConfirmDialog
      open={state.open}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      {...state.options}
    />
  );

  return { confirm, ConfirmDialog: ConfirmDialogElement };
}
