## Context

Interactive battles start with `GamePhase.Initiative`. The engine already owns a complete transition: `advanceInteractiveSessionPhase` (`src/engine/InteractiveSession.phases.ts:154-169`) rolls initiative via `rollInitiative(...)` with the session's D6 roller and calls `advancePhase(session)` — the Initiative branch needs no player input beyond "go". The networked surface exposes this through an all-phase "End phase" button (`src/components/multiplayer/NetworkedGameSurface.actionbar.tsx:258-275`, `data-testid="advance-phase-button"`, sends `endPhaseIntent`). The single-player surface does not: the TacticalActionDock command registry has no Initiative-phase commands (documented by `TacticalActionDock.01.test.tsx:237-251`), the dock's End Phase command lives only in `heatEndCommands.ts` (Heat/End phases), and store adoption (`setInteractiveSessionLogic`, `src/stores/useGameplayStore.session.ts:264-285`) drops an Initiative-phase session into `InteractivePhase.SelectUnit`, which renders movement overlays and a "Pick a movement path" prompt the engine will reject: `declareMovement` throws `Not in movement phase` (`src/utils/gameplay/gameSessionCore.movement.ts:54-56`) as an uncaught error.

Separately, the GM dock (`?gm=1` → `resolveGameSessionShellMode`, `src/pages-modules/gameplay/games/gmTacticalInterventionSurface.ts:44-46`) offers "Advance Phase (GM)" (`gmReferralCommands.ts:37-46`) which commits a preview intent (`GM_TACTICAL_PREVIEW_ACTION_ID = 'gm-intervention.preview'`, `GmTacticalCommandPreviewAdapter.ts:21`). Approval produces projected effects (`applyGmCombatProjectedEffects`, `GmCombatInterventionImplementer.ts:97`) that reach the turn-rail projection (`usePhaseQueueProjection.ts` — rail showed MOVEMENT with a "2 pending" badge) but are never written back to the live `InteractiveSession` — the engine stayed in Initiative and the next Lock In crashed (playtest finding C2, spec violation of the approve-commits guarantee).

Constraints: this repo implements sequentially via Codex workers; the deep-play audit harness change (`extend-ux-audit-deep-play-journeys`) will capture before/after engine phase around GM approval, so this fix becomes machine-verifiable once both land.

## Goals / Non-Goals

**Goals:**
- A player on the single-player surface can always progress the battle: a phase-progression control exists in every `GamePhase`, including Initiative.
- Approved GM tactical interventions mutate the live engine session; display projections reconcile to committed state.
- Out-of-phase map interaction can no longer produce an uncaught engine throw.

**Non-Goals:**
- No changes to the networked surface's action bar (already correct).
- No auto-advance / auto-initiative match setting (future option).
- No changes to initiative rules, morale passes, or any `advancePhase` branch internals.
- Not fixing C3/C4/C5 from the playtest report (separate changes).

## Decisions

**D1 — Reuse the engine transition; add a dock command, not a new pathway.**
Add an `EndPhaseCommand`-family command for Initiative (label "Roll Initiative & Begin", category `phase`) to the dock registry so Initiative is no longer command-less, and surface the same control in the turn rail area where `phase-name` renders (mirror of the networked bar affordance). It calls the existing store action that wraps `advanceInteractiveSessionPhase` — no new engine API. Alternative considered: auto-advance Initiative on session adoption (zero-click). Rejected: hides the initiative roll from the player, diverges from the networked surface's explicit model, and removes the natural pause where a GM might intervene on initiative.

**D2 — Store adoption gates interactive affordances by engine phase.**
`setInteractiveSessionLogic` maps `GamePhase.Initiative` to a new `InteractivePhase` value (e.g. `AwaitPhaseStart`) instead of `SelectUnit`. In that interactive phase the map does not render movement overlays or the "Pick a movement path" prompt; unit selection remains allowed for inspection only. Alternative: keep `SelectUnit` and guard every intent dispatcher. Rejected: whack-a-mole; the phase gate belongs at the state-machine root.

**D3 — UI-level phase guard wraps intent dispatch; engine throw remains a defensive invariant.**
The movement/attack intent dispatchers check `session.currentState.phase` before calling engine actions and, on mismatch, show a non-blocking notice (existing toast system) naming the current phase and the control that advances it. `declareMovement`'s throw stays (engine contract), but nothing user-reachable routes into it out-of-phase. Rationale: the audit journey must be able to click anywhere without producing a dev-overlay crash.

**D4 — GM approval commit step writes projected effects into the InteractiveSession through one seam.**
Extend the tactical approval path (`TacticalActionDock.gmIntervention.tsx` → adapter) so an approved preview applies its projected effects to the live session via the store's session mutation seam (same place `advanceInteractiveSessionPhase` writes back: `context.setSession(...)`), then appends the intervention record exactly as today. For `gm.advance-phase` specifically the committed effect IS `advanceInteractiveSessionPhase`. The turn-rail projection's "pending" entries clear when the underlying session reflects the effect. Alternative: keep projection-only and have the rail poll for divergence. Rejected: violates the gm-cascade-preview approve guarantee (approve = applied) and leaves every other GM correction family display-only too. Note: implementer must audit which of the 10 GM command families currently commit vs project-only, and route ALL of them through the commit seam; the playtest proved advance-phase is projection-only, others are suspect.

**D5 — Error handling & a11y.**
The phase-advance control is a real `<button>` with `data-testid="sp-advance-phase-button"` (distinct from the networked testid to keep e2e selectors unambiguous), disabled-with-reason when blockers exist (existing "End phase distinguishes no-op from unresolved actions" scenario), and the out-of-phase notice is announced politely (`aria-live="polite"`). Zustand state changes stay in existing stores (`useGameplayStore`); no new store.

## Risks / Trade-offs

- [GM commit for damage/heat/lifecycle families may have partially-implemented projections] → task scopes an explicit audit of all 10 families; families whose projected-effect application to `IGameState` is incomplete get wired through the same seam but with their current effect payloads — no new effect semantics invented in this change.
- [New `InteractivePhase` value ripples through UI switches] → grep-driven update of `InteractivePhase` consumers; jest+babel passes wrong enum members silently (known repo gotcha) — tasks require typecheck gate, not just tests.
- [Turn-rail pending-badge reconciliation could double-apply effects (projection + commit)] → commit step must replace, not stack with, the projection entry; integration test asserts single application (phase advances exactly one step per approval).
- [Session persistence: committed phase must survive reload] → reuse existing session persistence (playtest verified state survives reload); integration test covers reload-after-advance.

## Migration Plan

Pure additive UI/store change plus a commit-path fix; no data migration. Rollback = revert the change PR. The deep-play audit journey (separate change) re-run verifies: SP battle reaches Movement without `?gm=1`, no uncaught error on out-of-phase clicks, GM approval changes engine phase.

## Open Questions

- None blocking. If the GM family audit (D4) reveals a family whose projection cannot be applied to live state without new semantics (e.g. attack-resolution correction mid-resolution), that family stays projection-only with an explicit deferred/unsupported response (per gm-cascade-preview's unsupported-domain rule) and is logged in the tasks as follow-up.
