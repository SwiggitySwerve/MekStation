# Change: Add Indirect Fire and Spotter Network

## Why

The Wave 7 OMO Council adversary review confirmed via grep that **zero indirect-fire / spotter combat logic is wired into `src/engine/`**. The utility module at `src/utils/gameplay/indirectFire.ts` (374 LOC) exists and ships with 594 LOC of unit tests — but it is an orphan: no production code in `src/engine/`, `src/lib/combat/`, or `src/services/` imports it. `grep -rn "import.*indirectFire" src/` returns nothing.

The current `openspec/specs/indirect-fire-system/spec.md` (102 LOC) already documents the helper-level mechanics — spotter selection, LRM-only support, +1 base / +1 spotter-walked penalties, semi-guided + TAG, Arrow IV deferred. What it does **not** document is the **integration contract**: how the combat resolver invokes the spotter pipeline, how the `InteractiveSession` exposes spotter candidates each turn, how the to-hit calculator consumes the result, what happens when a spotter dies mid-turn after being elected, and how the typed combat-event log records spotter selection + indirect-fire flags. Those gaps are the reason a LRM boat in a real playtest still has no observable indirect-fire behavior — the helper produces results no one reads.

This change closes that gap end-to-end with a delta to `indirect-fire-system` (expanding it from helper-level to engine-integration-level), a delta to `combat-resolution` (adding the dispatch + event-log requirements), and a delta to `weapon-system` (adding the indirect-mode toggle + range/min-range behavior). It also adds the **Forward Observer** pilot SPA — MegaMek `MISC_FORWARD_OBSERVER` (`PilotOptions.java:98`) — which cancels the spotter movement penalty when active.

**Scope discipline**: Arrow IV / artillery-from-orbit / mortar-indirect / counter-battery fire are all OUT. Standard LRM + Mek Mortar indirect, semi-guided with TAG, FO ability, NARC/iNarc as auto-spotter, and the engine wiring around them are IN. Arrow IV remains the placeholder requirement already in `indirect-fire-system/spec.md` for a future change (`add-arrow-iv-artillery`).

## What Changes

### Capability deltas

- **MODIFIED `indirect-fire-system`** — expand from helper-level to engine-integration-level:
  - ADDED **Engine Integration Contract**: `InteractiveSession.computeIndirectFireContext(attackerId, weaponId, targetHex)` SHALL return an `IIndirectFireResolution` consumed by the to-hit pipeline before the attack roll resolves. The contract enumerates spotter candidates from the current `gameState`, runs the existing `evaluateIndirectFire` helper, and produces a stable `spotterId | undefined` plus a `toHitPenalty` integer for the attack pipeline. Today no caller invokes the helper from inside the resolver.
  - ADDED **Spotter Liveness Check**: a spotter selected at to-hit time but destroyed before the resolution step SHALL invalidate the indirect attack (auto-miss with the typed `IndirectFireSpotterLost` event); the attacker SHALL still consume ammo/heat.
  - ADDED **NARC / iNarc Spotter Override**: a target that is NARC-marked or iNarc-marked by a friendly unit SHALL be treated as a valid spotter source even when no friendly unit has LOS. Mirrors MegaMek `ComputeToHit.java:374-378`.
  - ADDED **Forward Observer SPA**: pilots with the `FORWARD_OBSERVER` SPA SHALL act as spotters without the +1 spotter-walked penalty regardless of their movement type that turn. Mirrors MegaMek `OptionsConstants.MISC_FORWARD_OBSERVER`.
  - ADDED **Indirect-Eligible Weapon Catalog**: the spec SHALL enumerate exactly which weapon families may fire indirectly — LRM, LRM-IMP (Improved), MML (in LRM mode), Mek Mortar, NLRM (Streak NOT eligible). Mirrors MegaMek `ComputeToHit.java:384-388`. The existing requirement says "LRM weapons" which is too narrow.
  - ADDED **Spotter-Election Determinism**: when more than one valid spotter exists, the resolver SHALL pick the spotter with (a) the lowest movement penalty, (b) ties broken by closest range to the target, (c) further ties broken by the lowest `entityId`. This makes replays + tests deterministic. Mirrors MegaMek `Compute.findSpotter()` shape.
  - ADDED **Min-Range Calculation Origin**: minimum-range penalty SHALL be measured **attacker-to-target** (not spotter-to-target). The existing spec asserts this implicitly via "range SHALL be calculated from the attacker to the target" — promote to a top-level requirement to prevent future drift.
  - MODIFIED **Semi-Guided LRM with TAG**: clarify that TAG designation must be from the **current turn** (not a stale tag) and that semi-guided LRM falls back to standard indirect (not standard direct) when TAG is absent.

- **MODIFIED `combat-resolution`** — add dispatch + event-log requirements for indirect attacks:
  - ADDED **Indirect-Fire Dispatch**: when an attack's `weapon.curMode === 'Indirect'`, the resolver SHALL call `computeIndirectFireContext` before `computeToHit` and SHALL fold the penalty + spotter into the attack record.
  - ADDED **Indirect-Fire Event Coverage**: the typed event log SHALL emit `IndirectFireSpotterSelected`, `IndirectFireSpotterLost`, `IndirectFireForwardObserver`, and `IndirectFireNarcOverride` events with stable fields `{ attackerId, spotterId | null, weaponId, ammoId, targetHex, toHitPenalty, basis: 'los' | 'narc' | 'inarc' | 'semi-guided-tag' }`. Pairs with the event-log line-format suite (project memory: `project_event_log_line_format_suite`).

- **MODIFIED `weapon-system`** — add the indirect-mode toggle + interaction with min-range:
  - ADDED **Weapon Indirect Mode Toggle**: indirect-eligible weapons SHALL expose a `mode: 'Direct' | 'Indirect'` field defaulting to `Direct`. Toggling to `Indirect` for a non-eligible weapon SHALL be rejected at the UI layer and SHALL be ignored if it reaches the resolver.
  - ADDED **Mode Persistence**: weapon mode SHALL be part of the per-weapon combat state slice and SHALL serialize/deserialize round-trip through the existing event-log replay path.

### Code touch points (Apply Wave — not in this change)

The Apply wave will need to touch (estimate, for proposal completeness):

- `src/engine/InteractiveSession.ts` — add `computeIndirectFireContext`, plumb into existing to-hit call
- `src/utils/gameplay/toHit/calculate.ts` — consume `IIndirectFireResolution`, apply penalty
- `src/lib/combat/combatResolution.ts` — emit the four new event types
- `src/types/gameplay/CombatInterfaces.ts` — add `IIndirectFireResolution`, `IndirectFireSpotterSelected | Lost | ForwardObserver | NarcOverride` event variants, `weapon.mode` field
- `src/lib/spa/catalog/gunnerySPAs.ts` — register `FORWARD_OBSERVER` SPA
- `src/components/gameplay/WeaponPanel.tsx` (or equivalent) — render the indirect-mode toggle on LRM/MML/Mek Mortar
- `src/services/combat/replays/eventLogFormatter.ts` (or equivalent) — extend the columnar formatter for the 4 new event types

## Capabilities

### Modified

- `indirect-fire-system` — expands from helper-level to engine-integration-level; adds NARC override, FO SPA, deterministic spotter election, eligible-weapon catalog, min-range origin, current-turn TAG requirement
- `combat-resolution` — adds indirect-fire dispatch step + 4 typed event variants
- `weapon-system` — adds the `mode: 'Direct' | 'Indirect'` toggle with eligibility validation + persistence round-trip

### New

(None — `indirect-fire-system` already exists as a capability)

## Impact

- **Affected source files (Apply estimate)**: ~8 files, ~600-900 LOC across engine/resolver/types/event-log/SPA-catalog/UI. The orphan `src/utils/gameplay/indirectFire.ts` (374 LOC + 594 LOC tests) becomes the helper layer consumed by the new resolver code — keep, don't rewrite.
- **No new transport** — uses the existing Zustand stores + typed event-log.
- **No DB migration** — combat state is in-memory + event-log file (per `replay-library` capability).
- **Storybook deltas**: 1-2 stories for the weapon-mode toggle and the FO badge in the spotter-selection HUD (Apply wave only).
- **Test footprint estimate (Apply wave)**: ~30-50 new unit tests + 3-5 scenario tests; the existing 594-LOC `indirectFire.test.ts` is retained and exercised through the resolver, not directly.

## Non-Goals

- **Arrow IV artillery** — remains a placeholder requirement in `indirect-fire-system` for the future `add-arrow-iv-artillery` change. Out of this change's scope: deviation tables, scatter rolls, area damage, counter-battery observation.
- **Artillery from orbit / Aerospace artillery bay** — out; bundled with the future `add-aerospace-artillery` change.
- **Mek Mortar smoke / smoke-grenade indirect** — indirect dispatch routes mortar through the same pipeline, but smoke ammo's area effect remains the responsibility of the existing ammunition catalog. The new event variants record `ammoId` for downstream consumers.
- **Counter-battery fire** — separate spec needed for the observer pipeline.
- **Indirect-fire AI heuristics** — bot decision-making to choose indirect vs direct is out; the AI advisor will be updated in a follow-up change once the resolver path stabilizes.
- **Munitions overhaul** — Improved-NARC, Listen-Kill, Anti-TSM, FASCAM are all already-modeled ammo types or out-of-scope; this change does not introduce new ammo families.

## Open Questions

- **Should the Forward Observer SPA cost mirror MegaMek's XP cost?** Decision: defer to the SPA catalog's existing cost normalization (post-archive note); the spec requires the SPA to exist + behave as specified, leaves the catalog cost to the existing `add-spa-progression` change.
- **Should NARC-marked enemies be visible to all friendly units as spotter sources, or only the unit that fired the NARC?** Decision: all friendly units, mirroring MegaMek (`te.isNarcedBy(ae.getOwner().getTeam())`). Recorded in the requirement.
- **Should `IndirectFireSpotterLost` auto-miss also refund the spotter's +1 spotting-fire penalty if the spotter took fire and survived but the resolver subsequently invalidated it?** Decision: no — the spotter penalty applies for the entire turn once the spotter declared the spot. Liveness check only affects the firing attack's hit/miss.
