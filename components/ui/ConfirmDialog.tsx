'use client';

import { Fragment, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import { AlertTriangle, Info } from 'lucide-react';
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

/* Warning triangle SVG (matches user design) */
const WarnIconSvg = () => (
  <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, stroke: '#f43f5e', fill: 'none', strokeWidth: 2 }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

const variantConfig: Record<
  ConfirmVariant,
  {
    icon: ReactNode;
    accentColor: string;
    confirmLabel: string;
  }
> = {
  danger: {
    icon: <WarnIconSvg />,
    accentColor: '#f43f5e',
    confirmLabel: 'Usuń',
  },
  warning: {
    icon: <AlertTriangle className="w-[22px] h-[22px]" style={{ color: '#f59e0b' }} />,
    accentColor: '#f59e0b',
    confirmLabel: 'Potwierdź',
  },
  info: {
    icon: <Info className="w-[22px] h-[22px]" style={{ color: '#00d9ff' }} />,
    accentColor: '#00d9ff',
    confirmLabel: 'Potwierdź',
  },
};

export const ConfirmDialog = ({
  open,
  onConfirm,
  onCancel,
  title = 'Potwierdzenie',
  message = 'Czy na pewno chcesz kontynuować?',
  confirmLabel,
  cancelLabel = 'Anuluj',
  variant = 'danger',
}: ConfirmDialogProps) => {
  const [mounted, setMounted] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cfg = variantConfig[variant];
  const effectiveConfirmLabel = confirmLabel ?? cfg.confirmLabel;

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

  const accent = cfg.accentColor;
  const accentRgb = accent === '#f43f5e' ? '244,63,94' : accent === '#f59e0b' ? '245,158,11' : '0,217,255';

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
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(3,6,14,0.85)',
              backdropFilter: 'blur(8px)',
              zIndex: 99998,
            }}
          />
        </Transition.Child>

        {/* Panel */}
        <div
          style={{ position: 'fixed', inset: 0, overflowY: 'auto', zIndex: 99999 }}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <HeadlessDialog.Panel
                style={{
                  width: 400,
                  maxWidth: 'min(400px, 90vw)',
                  background: `radial-gradient(ellipse at 50% 0%, rgba(${accentRgb},0.04) 0%, transparent 50%), #0a1628`,
                  border: `1px solid rgba(${accentRgb},0.2)`,
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: `0 0 60px rgba(${accentRgb},0.06), 0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(${accentRgb},0.06)`,
                  animation: 'confirmDialogIn 0.2s ease-out',
                }}
              >
                <style>{`
                  @keyframes confirmDialogIn {
                    from { opacity: 0; transform: scale(0.95) translateY(8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                  }
                `}</style>

                <div
                  style={{
                    padding: '28px 28px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                  }}
                >
                  {/* Warning icon */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: `rgba(${accentRgb},0.08)`,
                      border: `1px solid rgba(${accentRgb},0.15)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 18,
                      position: 'relative',
                    }}
                  >
                    {cfg.icon}
                  </div>

                  <HeadlessDialog.Title
                    as="h3"
                    style={{
                      fontFamily: 'Rajdhani, sans-serif',
                      fontSize: 17,
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.9)',
                      marginBottom: 8,
                      letterSpacing: 0.3,
                    }}
                  >
                    {title}
                  </HeadlessDialog.Title>

                  <div
                    style={{
                      fontFamily: 'Exo 2, sans-serif',
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.35)',
                      lineHeight: 1.5,
                      maxWidth: 300,
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {message}
                  </div>
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '16px 28px 24px',
                    justifyContent: 'center',
                  }}
                >
                  <button
                    type="button"
                    onClick={onCancel}
                    style={{
                      padding: '9px 28px',
                      fontFamily: 'Rajdhani, sans-serif',
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: 0.5,
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                      color: 'rgba(255,255,255,0.45)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                  >
                    {cancelLabel}
                  </button>
                  <button
                    ref={confirmRef}
                    type="button"
                    onClick={onConfirm}
                    style={{
                      padding: '9px 28px',
                      fontFamily: 'Rajdhani, sans-serif',
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      borderRadius: 8,
                      border: `1px solid rgba(${accentRgb},0.3)`,
                      background: `linear-gradient(135deg, rgba(${accentRgb},0.15), rgba(${accentRgb},0.06))`,
                      color: accent,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `rgba(${accentRgb},0.5)`;
                      e.currentTarget.style.background = `linear-gradient(135deg, rgba(${accentRgb},0.25), rgba(${accentRgb},0.12))`;
                      e.currentTarget.style.boxShadow = `0 0 20px rgba(${accentRgb},0.1)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `rgba(${accentRgb},0.3)`;
                      e.currentTarget.style.background = `linear-gradient(135deg, rgba(${accentRgb},0.15), rgba(${accentRgb},0.06))`;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {effectiveConfirmLabel}
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
