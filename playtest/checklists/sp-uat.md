# Single-Player UAT Checklist — Phase 2

Run against `npm run dev` on `http://localhost:3600`. One pass per scenario type; one "weird" variant. File defects to `playtest/ISSUES.md`. Feature gaps → `playtest/CLOSEOUT.md` "gaps" section.

## Smoke pass (happy path)

For **each scenario type** (Annihilation, Capture-the-flag, Defend, Breakthrough):

- [ ] Lobby loads without console errors
- [ ] Quick Game form accepts BV / AI tier / biome / radius
- [ ] Force generation produces a legal lance for the selected BV
- [ ] Battle map renders; both sides visible; hex coords readable
- [ ] First turn: can select a unit, see movement reachable hexes
- [ ] Movement commits; turn passes to opponent; AI moves
- [ ] Weapons-fire phase: target selection works; to-hit shows
- [ ] Damage applies; armor pip layout updates
- [ ] Heat phase resolves; heat indicator updates per unit
- [ ] Battle ends within the turn-limit at a sensible state (winner / draw / forced-withdrawal)
- [ ] Post-battle review screen loads with battle summary
- [ ] Replay Library lists the just-finished match
- [ ] Open replay from library → timeline scrubbable → frame counter advances → ComponentDestroyed / CriticalHitResolved pip-state updates render

## Edge variants (one of each, can spread across scenarios)

- [ ] **Force withdrawal trigger** — opfor takes >50% casualties, confirm morale-based withdrawal path fires
- [ ] **Objective hex captured then lost** — capture an objective, then lose control next turn, verify scoring updates both ways
- [ ] **Morale break mid-turn** — heat-suicide or critical-cluster causes morale break, verify the broken unit's behavior matches spec
- [ ] **Replay scrubber edge frames** — drag to turn 0, turn final, turn final+1; no overshoot, no off-by-one, no blank canvas

## Asserts (manual observation)

- [ ] No red console errors during a full match
- [ ] No unhandled promise rejection toasts
- [ ] No Zod validation toasts at the store boundary (the Waves-1-5 Zod enforcement on store + unit-JSON should keep this clean)
- [ ] Animation queue keeps up with cursor movement (no frozen attack effects)
- [ ] HexMapDisplay AttackEffectsLayer mounts and renders projectile sprites
- [ ] Reduced-motion preference respected (test by toggling OS-level reduce-motion mid-match if practical)

## Soft-lock checks

- [ ] Hitting Esc / browser back during a turn does not desync state
- [ ] Refresh during battle restores a sensible state (or shows the right error toast)
- [ ] Replay → Quick Game new → Replay → Quick Game flip doesn't accumulate stale state in the Zustand store

## Sign-off

- [ ] Final-pass timestamp: `____________`
- [ ] Defect count filed in `ISSUES.md`: `____________`
- [ ] Gaps logged for `CLOSEOUT.md`: `____________`
