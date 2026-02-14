# Checklist testów - co odpalać po większych zmianach

## Komenda
```bash
npx vitest run
```

## Testy (wszystkie w `tests/`)
- [x] `tests/deadline-engine.test.ts` - deadline engine
- [x] `tests/red-flags-engine.test.ts` - red flags
- [x] `tests/utils.test.ts` - formatowanie dat, relative time, online/away detection
- [x] `tests/galactic-utils.test.ts` - math: distance, angle, clamp, lerp, mapRange
- [x] `tests/galactic-zoom.test.ts` - zoom config, easing, screen<->canvas conversion
- [x] `tests/galactic-interactions.test.ts` - hit detection, object finding
- [x] `tests/galactic-data-transformer.test.ts` - progress, status colors, dependencies transform
- [x] `tests/chat-permissions.test.ts` - uprawnienia czatu (owner, moderator, member, profile admin)

## Kiedy odpalać
- Zmiana w deadline engine / red flags -> `npx vitest run`
- Zmiana w lib/utils.ts (formatowanie, online status) -> `npx vitest run`
- Zmiana w galactic view (zoom, interakcje, data transformer) -> `npx vitest run`
- Zmiana w czacie (lib/chat/permissions.ts) -> `npx vitest run`
- Przed pushem do repo -> `npx vitest run`
- Po większym refaktorze -> `npx vitest run`

## Co NIE jest testowane (sprawdzaj ręcznie)
- Wygląd UI (otwórz przeglądarkę)
- Query do Supabase (czy dane przychodzą)
- RLS (czy user widzi tylko swoje dane)
- Responsywność / animacje
