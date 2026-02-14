'use client';

import dynamic from 'next/dynamic';

export const CommsBeaconClient = dynamic(
  () => import('./CommsBeacon').then((m) => ({ default: m.CommsBeacon })),
  { ssr: false }
);
