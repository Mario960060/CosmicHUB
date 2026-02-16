'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  format,
  parse,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
  getDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

const INPUT_DATE_FORMAT = 'yyyy-MM-dd';
const DISPLAY_FORMAT = 'dd/MM/yyyy';

interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  /** Extra Tailwind classes for the trigger button */
  buttonClassName?: string;
  /** Render calendar in portal (fixes clipping inside modals) */
  usePortal?: boolean;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Select date',
  min,
  max,
  buttonClassName,
  usePortal = true,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const current = value ? parse(value, INPUT_DATE_FORMAT, new Date()) : new Date();
    return startOfMonth(current);
  });
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const current = value ? parse(value, INPUT_DATE_FORMAT, new Date()) : null;
  const displayValue = current ? format(current, DISPLAY_FORMAT) : '';
  const minDate = min ? parse(min, INPUT_DATE_FORMAT, new Date()) : null;
  const maxDate = max ? parse(max, INPUT_DATE_FORMAT, new Date()) : null;

  // Sync viewMonth when value changes externally
  useEffect(() => {
    if (value) {
      setViewMonth(startOfMonth(parse(value, INPUT_DATE_FORMAT, new Date())));
    }
  }, [value]);

  // Update panel position when opening (for portal mode)
  useEffect(() => {
    if (isOpen && usePortal && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelPosition({ top: rect.bottom + 8, left: rect.left });
    }
  }, [isOpen, usePortal]);

  // Click outside to close (panel może być w portalu – sprawdzamy też panelRef)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = containerRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inTrigger && !inPanel) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  // Monday = 0, Sunday = 6
  const rawDay = getDay(monthStart);
  const startPad = rawDay === 0 ? 6 : rawDay - 1;
  const padBefore = Array(startPad).fill(null);

  const isDisabled = useCallback(
    (d: Date) => {
      if (minDate && isBefore(d, minDate)) return true;
      if (maxDate && isBefore(maxDate, d)) return true;
      return false;
    },
    [minDate, maxDate],
  );

  const handleSelect = (d: Date) => {
    onChange(format(d, INPUT_DATE_FORMAT));
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = startOfDay(new Date());
    if (isDisabled(today)) return;
    onChange(format(today, INPUT_DATE_FORMAT));
    setIsOpen(false);
  };

  const prevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewMonth((m) => subMonths(m, 1));
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewMonth((m) => addMonths(m, 1));
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div ref={containerRef} className="relative w-full" style={{ fontFamily: "'Exo 2', sans-serif" }}>
      {/* ---- Trigger Button ---- */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={
          buttonClassName ??
          'w-full text-left cursor-pointer transition-all duration-200'
        }
        style={
          buttonClassName
            ? undefined
            : {
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.875rem',
                color: value ? '#00f0ff' : 'rgba(0, 240, 255, 0.45)',
                backgroundColor: 'rgba(5, 15, 30, 0.85)',
                border: `1px solid ${isOpen ? 'rgba(0, 240, 255, 0.5)' : 'rgba(0, 240, 255, 0.15)'}`,
                boxShadow: isOpen
                  ? '0 0 12px rgba(0, 240, 255, 0.12), inset 0 0 20px rgba(0, 240, 255, 0.03)'
                  : 'inset 0 0 20px rgba(0, 240, 255, 0.02)',
                transition: 'all 0.25s ease',
              }
        }
      >
        <span className="flex items-center gap-2.5">
          <Calendar
            size={15}
            style={{
              color: value ? '#00f0ff' : 'rgba(0, 240, 255, 0.35)',
              filter: value ? 'drop-shadow(0 0 3px rgba(0,240,255,0.4))' : 'none',
            }}
          />
          <span>{displayValue || placeholder}</span>
          {value && (
            <X
              size={13}
              onClick={handleClear}
              className="ml-auto opacity-40 hover:opacity-90 transition-opacity"
              style={{ color: '#00f0ff' }}
            />
          )}
        </span>
      </button>

      {/* ---- Calendar Panel ---- */}
      {isOpen && (() => {
        const panelEl = (
        <div
          ref={panelRef}
          className="z-[9999]"
          style={{
            position: usePortal ? 'fixed' : 'absolute',
            top: usePortal ? panelPosition.top : undefined,
            left: usePortal ? panelPosition.left : 0,
            marginTop: usePortal ? 0 : 8,
            width: '300px',
            borderRadius: '14px',
            overflow: 'hidden',
            background: 'linear-gradient(170deg, rgba(8, 18, 38, 0.97) 0%, rgba(5, 10, 25, 0.99) 100%)',
            border: '1px solid rgba(0, 240, 255, 0.12)',
            boxShadow: `
              0 20px 60px rgba(0, 0, 0, 0.6),
              0 0 40px rgba(0, 240, 255, 0.06),
              inset 0 1px 0 rgba(0, 240, 255, 0.08)
            `,
            backdropFilter: 'blur(20px)',
            animation: 'cosmicFadeIn 0.2s ease-out',
          }}
        >
          {/* Subtle top glow line */}
          <div
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent 5%, rgba(0,240,255,0.25) 50%, transparent 95%)',
            }}
          />

          <div style={{ padding: '16px' }}>
            {/* ---- Month Navigation ---- */}
            <div className="flex items-center justify-between" style={{ marginBottom: '14px' }}>
              <button
                type="button"
                onClick={prevMonth}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(0, 240, 255, 0.08)',
                  background: 'rgba(0, 240, 255, 0.03)',
                  color: '#00f0ff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 240, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.08)';
                }}
              >
                <ChevronLeft size={16} />
              </button>

              <span
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  letterSpacing: '2px',
                  color: '#e2e8f0',
                  textTransform: 'uppercase',
                }}
              >
                {format(viewMonth, 'MMM yyyy')}
              </span>

              <button
                type="button"
                onClick={nextMonth}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(0, 240, 255, 0.08)',
                  background: 'rgba(0, 240, 255, 0.03)',
                  color: '#00f0ff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 240, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 240, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.08)';
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* ---- Weekday Headers ---- */}
            <div
              className="grid grid-cols-7"
              style={{ gap: '2px', marginBottom: '6px' }}
            >
              {weekDays.map((wd) => (
                <div
                  key={wd}
                  style={{
                    textAlign: 'center',
                    fontSize: '0.6rem',
                    fontWeight: 500,
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    color: 'rgba(0, 240, 255, 0.35)',
                    padding: '4px 0',
                    fontFamily: "'Orbitron', sans-serif",
                  }}
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* ---- Days Grid ---- */}
            <div className="grid grid-cols-7" style={{ gap: '2px' }}>
              {padBefore.map((_, i) => (
                <div key={`pad-${i}`} style={{ width: '36px', height: '36px' }} />
              ))}

              {days.map((day) => {
                const disabled = isDisabled(day);
                const selected = current && isSameDay(day, current);
                const today = isToday(day);
                const hovered = hoveredDay && isSameDay(day, hoveredDay);
                const inMonth = isSameMonth(day, viewMonth);

                // Determine day cell styles
                let bgColor = 'transparent';
                let textColor = inMonth ? '#94a3b8' : '#334155';
                let borderColor = 'transparent';
                let shadow = 'none';
                let fontWeight = 400;

                if (selected) {
                  bgColor = 'rgba(0, 240, 255, 0.15)';
                  textColor = '#00f0ff';
                  borderColor = 'rgba(0, 240, 255, 0.4)';
                  shadow = '0 0 12px rgba(0, 240, 255, 0.15), inset 0 0 8px rgba(0, 240, 255, 0.05)';
                  fontWeight = 700;
                } else if (hovered && !disabled) {
                  bgColor = 'rgba(0, 240, 255, 0.06)';
                  textColor = '#e2e8f0';
                  borderColor = 'rgba(0, 240, 255, 0.12)';
                } else if (today) {
                  textColor = '#00f0ff';
                  fontWeight = 600;
                }

                if (disabled) {
                  textColor = '#1e293b';
                }

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={disabled}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!disabled) handleSelect(day);
                    }}
                    onMouseEnter={() => !disabled && setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    style={{
                      width: '36px',
                      height: '36px',
                      fontSize: '0.8rem',
                      fontWeight,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: textColor,
                      backgroundColor: bgColor,
                      border: `1px solid ${borderColor}`,
                      boxShadow: shadow,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      fontFamily: "'Exo 2', sans-serif",
                    }}
                  >
                    {format(day, 'd')}
                    {/* Today dot indicator */}
                    {today && !selected && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '3px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '3px',
                          height: '3px',
                          borderRadius: '50%',
                          backgroundColor: '#00f0ff',
                          boxShadow: '0 0 4px #00f0ff',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ---- Footer ---- */}
            <div
              className="flex items-center justify-between"
              style={{
                marginTop: '14px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(0, 240, 255, 0.06)',
              }}
            >
              <button
                type="button"
                onClick={handleClear}
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  letterSpacing: '1px',
                  color: '#475569',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.15s ease',
                  fontFamily: "'Exo 2', sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                CLEAR
              </button>

              <button
                type="button"
                onClick={handleToday}
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  letterSpacing: '1.5px',
                  color: '#00f0ff',
                  background: 'rgba(0, 240, 255, 0.06)',
                  border: '1px solid rgba(0, 240, 255, 0.15)',
                  cursor: 'pointer',
                  padding: '5px 14px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  fontFamily: "'Orbitron', sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 240, 255, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 240, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 240, 255, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.15)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                TODAY
              </button>
            </div>
          </div>
        </div>
        );
        return usePortal && typeof document !== 'undefined'
          ? createPortal(panelEl, document.body)
          : panelEl;
      })()}

      {/* Animation keyframe injected once */}
      <style>{`
        @keyframes cosmicFadeIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
