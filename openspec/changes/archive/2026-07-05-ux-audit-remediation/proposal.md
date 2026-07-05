# Proposal: ux-audit-remediation

## Why

The 2026-07-04 UX walkthrough audit (`.sisyphus/evidence/ux-walkthrough/2026-07-04T11-54-23/REVIEW.md`, run via `npm run qc:ux-audit`) found that a normal first-time player cannot complete the core loops: an accepted campaign mission cannot be launched from the UI, the default campaign economy starts and stays at zero C-bills, and the first quick-game auto-resolve returns a self-contradictory instant defeat. Five Major findings compound the broken first-session experience. These are the fixes needed for a new player to succeed.

## What Changes

- **Mission launch affordance**: mission cards for ACTIVE missions gain a primary "Launch" action routing to the existing mission launch page (today reachable only by direct URL).
- **Campaign economy bootstrap**: campaign presets apply non-zero starting funds at creation; contract market offers generate non-zero base pay (and coherent salvage terms) so the earn loop functions.
- **Quick-game auto-resolve integrity**: auto-resolve simulates to a genuine end condition and the results screen reports an outcome consistent with its own statistics (turns played vs. turn limit, verdict reason); the Key Moments panel shows its initial moments instead of rendering empty.
- **Wizard roster persistence**: pilots added in the campaign-creation wizard persist into the created campaign (dashboard Force Snapshot and launch readiness see them); a lone pilot auto-assigns to a lone unit.
- **Player-first navigation**: the dashboard gains a Gameplay entry card; the `/gameplay` hub leads with player actions, with the internal "Validated Gameplay Flows" QC matrix demoted to a dev-only surface.
- **Equipment browser link semantics**: equipment table rows become real links (keyboard-accessible, client-side navigation) instead of `onClick` + `window.location.href`.

No breaking changes.

## Capabilities

### New Capabilities

_None — all fixes modify existing specified behavior._

### Modified Capabilities

- `mission-contracts`: ACTIVE mission cards SHALL expose a launch action; generated contract offers SHALL carry non-zero base pay and self-consistent salvage terms.
- `campaign-presets`: built-in presets (CASUAL/STANDARD/FULL) SHALL define positive starting funds in their option overrides.
- `campaign-management`: the creation wizard SHALL apply the selected preset's options (including starting funds) and SHALL persist wizard roster pilots into the created campaign; single-pilot/single-unit rosters auto-assign.
- `game-engine-orchestration`: auto-resolve outcomes SHALL be consistent with the simulation record (turn counts, end reason).
- `quick-game-ui`: the results screen SHALL present verdict reasons consistent with battle statistics and SHALL render initial Key Moments when moments exist.
- `app-navigation`: the dashboard SHALL include a Gameplay navigation card; the gameplay hub SHALL lead with player-facing actions.
- `ui-flow-shell`: the validated-flows QC matrix SHALL be gated to development/QC contexts, not the default player view.
- `compendium-browser`: equipment catalog rows (all view modes) SHALL navigate via real anchor links with client-side routing.

## Impact

- **Code**: `src/pages/gameplay/campaigns/[id]/missions.tsx` (launch action), contract offer generation in campaign command actions, campaign creation submit path (`CreateCampaignPage.submit.ts`), quick-game engine/results (`QuickGamePlay`, `QuickGameResults*`), `src/pages/index.tsx` + `src/pages/gameplay/index.tsx` + `GameplayFlowShell`, `src/components/compendium/equipment/EquipmentViews.tsx`.
- **Specs**: delta specs for the seven capabilities above merge into `openspec/specs/` on completion.
- **Tests**: unit tests per fix + `npm run qc:ux-audit` journeys re-run as the end-to-end acceptance check (journey 06 gains an in-UI launch step once the affordance exists).
- **Dependencies/APIs**: none added; no schema changes expected (starting funds already modeled on campaign finances).

## Non-goals

- Minor/Polish audit findings (toast persistence duration, date-format drift, replay-library metadata quality, replay-viewer layout, hover-menu intent delay, "Salvage Rights: None (43%)" copy, pluralization) — track separately; fold in only where a fix touches the same lines.
- Balancing contract pay values or economy tuning beyond "non-zero and coherent".
- Auto-resolve combat-model fidelity improvements beyond honest end-condition and outcome reporting.
- The pre-existing `quick/index.tsx` duplicate-`<Head>` lint error (separate unstaged work).
