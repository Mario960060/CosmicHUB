'use client';

import { createContext, useContext } from 'react';

export interface GalaxyCanvasContextValue {
  zoom: number;
  scale: number;
  setScale: (s: number) => void;
}

export const GalaxyCanvasContext = createContext<GalaxyCanvasContextValue | null>(null);

export function useGalaxyCanvas() {
  const ctx = useContext(GalaxyCanvasContext);
  return ctx;
}
