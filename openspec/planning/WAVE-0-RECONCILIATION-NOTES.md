# Wave 0 Reconciliation Notes

**Status date:** 2026-04-30
**Scope:** Active OpenSpec changes under `openspec/changes/`
**Validation:** `npx openspec validate --all --strict` passes with 189 items,
0 failures.

Wave 0 audited each active change against current source and tests. It checked
off only tasks that were already proven by implementation evidence, test
evidence, or spec-admin artifacts. Remaining unchecked tasks are either not
implemented, not directly tested, or only partially aligned with the active
change.

## Result

| Change | Before | After | Notes |
| --- | ---: | ---: | --- |
| `wire-encounter-to-campaign-round-trip` | 0/42 | 9/42 | Outcome bus and day-advancement ordering are proven. |
| `add-infantry-construction` | 0/50 | 25/50 | Core types, defaults, validation helpers, and tests are proven. |
| `add-multi-type-record-sheet-export` | 0/54 | 2/54 | Spec scenarios and strict validation are proven; renderer/export work remains partial. |
| `add-p2p-game-session-sync` | 0/33 | 3/33 | Spec-admin tasks only; P2P/Yjs implementation remains open. |
| `add-game-session-invite-and-lobby-1v1` | 0/39 | 6/39 | A few server-backed lobby behaviors are proven; P2P lobby contract remains open. |
| `add-game-session-persistence-for-reconnect` | 0/39 | 4/39 | Spec-admin tasks only; requested local replay/persistence remains open. |
| `add-fog-of-war-event-filtering` | 0/39 | 5/39 | Spec-admin tasks only; event filtering remains open. |
| `add-movement-interpolation-animations` | 0/45 | 3/45 | Spec-admin tasks only; animation queue/tween work remains open. |
| `add-los-and-firing-arc-overlays` | 0/56 | 4/56 | Spec-admin tasks only; overlay implementation remains open. |
| `add-attack-visual-effects` | 0/48 | 4/48 | Spec-admin tasks only; attack visual primitives remain open. |
| `add-damage-feedback-effects` | 0/56 | 3/56 | Spec-admin tasks only; Phase 7 damage effects remain open. |
| `add-heat-and-shutdown-visual-indicators` | 0/51 | 3/51 | Spec-admin tasks only; token-level heat/shutdown visuals remain open. |

Total active queue progress is now 71/532.

## Key Remaining Gaps

### Campaign Closure

- Encounter launch accepts some linkage data, but tests do not yet assert full
  `campaignId`, `contractId`, and `scenarioId` propagation.
- The review page currently applies post-battle work immediately, which does
  not fully match the pending-until-day-advance flow.
- Pending-outcome banner code exists, but direct tests are missing.
- Contract fulfillment events and dashboard audit closure remain open.

### Phase 6 Construction And Export

- Infantry construction still needs exact unit/field-gun shape completion,
  field-gun UI, store/UI polish, armor-kit behavior, and final build/lint
  validation.
- Multi-type record sheet export has many skeleton renderers and extractors,
  but needs direct tests, full SVG output, preview integration, SPA placement
  across all unit types, and unknown-type error alignment.

### Phase 7 Tactical Visuals

- Existing movement, LOS, attack, damage, and heat systems are useful
  prerequisites, but they do not satisfy the Phase 7 visual specs.
- Shared tactical foundation work should still come before movement, LOS,
  attack, damage, and heat visual implementations.
- Reduced-motion behavior, animation queues, effect layers, and token overlay
  ordering remain the important shared contracts.

### Phase 4 Multiplayer

- Current multiplayer code is mostly server/WebSocket-oriented; several active
  specs still describe P2P/Yjs contracts that are not implemented.
- Lobby readiness and initial guest assignment have proof, but loadout
  selection, map config, launch handoff, and side-owner session writes remain
  open.
- Reconnect persistence needs the requested local match log, hydrate path,
  grace-state semantics, and chunk-size reconciliation.
- Fog-of-war work still needs visibility helpers, redaction tags, filtered
  broadcast, filtered replay, and performance coverage.

## Next Recommended Step

Start Wave 1 with one branch per independent lane:

- `codex/openspec-campaign-round-trip`
- `codex/openspec-infantry-construction`
- `codex/openspec-tactical-foundation-movement`
- `codex/openspec-p2p-game-session-sync`

Each branch should follow the per-change lifecycle in
`openspec/planning/ACTIVE-CHANGES-ROADMAP.md`: prepare, apply, verify, merge,
then archive after the implementation is on `main`.
