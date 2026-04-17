# Change: Add Heat and Shutdown Visual Indicators

## Why

Heat state is one of the biggest drivers of BattleTech tactical decisions
— a mech running hot is about to shut down, fail PSR, or cook off ammo —
and today nothing on the map telegraphs that. The heat bar lives in the
action panel only; the map shows an unchanged token even when the pilot
is one bad roll from a reactor shutdown. Phase 7 makes heat legible: a
token glows warmer as heat climbs, shutdown renders a powered-down
overlay, startup pulses, and an ammo-explosion-threshold warning halo
appears when the stars align for a reactor boom.

## What Changes

- Token glow shifts from neutral to orange to red as heat climbs
  through thresholds (5, 10, 15, 20)
- Shutdown state overlays a dimmed grayscale token with a "POWERED DOWN"
  label and a subtle flicker
- Startup animation plays a short radial pulse on the turn a unit
  reboots (success or failure branches both play — failure is shorter
  and fades to gray, success settles into full color)
- Overheat warning aura renders when a unit's heat is within ammo-
  explosion threshold territory (red-purple pulsing halo)
- Indicators layer over the sprite and damage overlay, beneath selection
- Respect reduced motion — glow becomes a static colored outline; pulse
  animations collapse to a single state change

## Dependencies

- **Requires**: `add-interactive-combat-core-ui` (Phase 1 MVP),
  `add-mech-silhouette-sprite-set` (glow renders around sprite),
  `heat-overflow-effects` (heat thresholds), `tactical-map-interface`
- **Related**: `add-damage-feedback-effects` (visual grammar shared)
- **Required By**: none — Phase 7 presentation layer

## Impact

- Affected specs: `heat-overflow-effects` (MODIFIED — expose heat
  threshold states for UI subscription), `tactical-map-interface`
  (MODIFIED — new heat glow layer, shutdown overlay, startup pulse,
  ammo-explosion warning halo)
- Affected code: new
  `src/components/gameplay/effects/HeatGlow.tsx`,
  `src/components/gameplay/effects/ShutdownOverlay.tsx`,
  `src/components/gameplay/effects/StartupPulse.tsx`,
  `src/components/gameplay/effects/AmmoExplosionAura.tsx`, new
  `src/utils/effects/heatVisualMap.ts` mapping heat levels to glow
  color/opacity
- Non-goals: sound effects (out), detailed damage cause-of-shutdown
  breakdown (panel concern), 3D effects (shelved)
- Database: none
