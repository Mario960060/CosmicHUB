'use client';

export function SpaceCanvasBackground() {
  return (
    <>
      {/* Layer 1: depth gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            radial-gradient(ellipse at 20% 30%, rgba(15,25,50,0.6) 0%, transparent 50%),
            radial-gradient(ellipse at 75% 65%, rgba(10,18,35,0.5) 0%, transparent 45%),
            radial-gradient(ellipse at 50% 50%, rgba(8,12,24,1) 0%, #050a14 100%)
          `,
        }}
      />
      {/* Layer 2: stars-far */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            radial-gradient(1px 1px at 15% 20%, rgba(255,255,255,0.12) 0%, transparent 100%),
            radial-gradient(1px 1px at 45% 35%, rgba(255,255,255,0.08) 0%, transparent 100%),
            radial-gradient(1px 1px at 70% 15%, rgba(255,255,255,0.1) 0%, transparent 100%),
            radial-gradient(1px 1px at 85% 55%, rgba(255,255,255,0.06) 0%, transparent 100%),
            radial-gradient(1px 1px at 25% 70%, rgba(255,255,255,0.09) 0%, transparent 100%),
            radial-gradient(1px 1px at 55% 85%, rgba(255,255,255,0.07) 0%, transparent 100%),
            radial-gradient(1px 1px at 90% 40%, rgba(255,255,255,0.11) 0%, transparent 100%),
            radial-gradient(1px 1px at 35% 90%, rgba(255,255,255,0.06) 0%, transparent 100%),
            radial-gradient(1px 1px at 60% 50%, rgba(255,255,255,0.08) 0%, transparent 100%),
            radial-gradient(1px 1px at 10% 45%, rgba(255,255,255,0.1) 0%, transparent 100%)
          `,
        }}
      />
      {/* Layer 3: stars-mid with twinkle */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            radial-gradient(1.5px 1.5px at 30% 25%, rgba(255,255,255,0.15) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 65% 45%, rgba(255,255,255,0.12) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 80% 70%, rgba(255,255,255,0.1) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 20% 60%, rgba(255,255,255,0.14) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 50% 15%, rgba(255,255,255,0.11) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 75% 30%, rgba(255,255,255,0.13) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 40% 80%, rgba(255,255,255,0.09) 0%, transparent 100%)
          `,
          animation: 'starsTwinkle 8s ease-in-out infinite',
        }}
      />
      {/* Layer 4: stars-near */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            radial-gradient(2px 2px at 25% 40%, rgba(255,255,255,0.2) 0%, transparent 100%),
            radial-gradient(2px 2px at 60% 65%, rgba(255,255,255,0.18) 0%, transparent 100%),
            radial-gradient(2px 2px at 85% 25%, rgba(255,255,255,0.15) 0%, transparent 100%),
            radial-gradient(2px 2px at 15% 75%, rgba(255,255,255,0.17) 0%, transparent 100%),
            radial-gradient(2px 2px at 45% 50%, rgba(255,255,255,0.16) 0%, transparent 100%)
          `,
          animation: 'starsTwinkle 6s ease-in-out infinite 1s',
        }}
      />
    </>
  );
}
