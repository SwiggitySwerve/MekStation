# Design: ux-audit-remediation

## Context

The 2026-07-04 UX walkthrough audit (`npm run qc:ux-audit`, review at `.sisyphus/evidence/ux-walkthrough/2026-07-04T11-54-23/REVIEW.md`) exposed three Critical and five Major failures in the first-session player experience. Root-cause locations are already known from the audit's code verification:

- Missions page (`src/pages/gameplay/campaigns/[id]/missions.tsx`) renders mission cards with no launch action; the launch page exists at `missions/[missionId]/launch.tsx` but has no in-UI entry point.
- Contract offers are auto-seeded by the contract-market page via campaign command actions with `basePayment` of 0 and "Salvage: None (43%)"-style display drift.
- Preset overrides (`campaign-presets`) define no `startingFunds`; the creation wizard (`CreateCampaignPage.submit.ts`) does not pass funding options, so `createCampaign` defaults to zero balance and the dashboard immediately raises a Critical runway alert.
- Wizard roster pilots go into `useCampaignRosterStore` via `initRoster`, but the dashboard Force Snapshot reports 0 pilots and launch readiness sees the unit unpiloted — the pilot is either not persisted or not read from where consumers look.
- Quick-game auto-resolve (`GameEngine.runToCompletion` → `QuickGamePlay` → `QuickGameResults`) returned "Defeat — Turn Limit" with turnsPlayed=1 against a limit of 9 and zero losses; the outcome record contradicts itself.
- `/gameplay` renders `GameplayFlowShell` (QC journey matrix with npm commands) above the player cards; the dashboard (`src/pages/index.tsx`) has no Gameplay card.
- Compendium equipment table rows navigate via `onClick` + `window.location.href` (`EquipmentViews.tsx:247-253`) — full reload, no anchor semantics.

## Goals / Non-Goals

**Goals:**
- A first-time player can complete: create campaign → accept contract → launch mission, entirely through the UI.
- A new campaign on any built-in preset starts financially viable; the earn loop (contract pay) is non-zero.
- Auto-resolve outcomes are internally consistent and explained on the results screen.
- Player-facing navigation leads with play; QC surfaces are dev-gated.
- Equipment catalog navigation is real-link, keyboard-accessible, client-side.

**Non-Goals:**
- Economy balancing/tuning beyond "positive and coherent" (values are placeholders subject to later balance passes).
- Combat-model fidelity improvements to auto-resolve beyond honest end-condition reporting.
- Minor/Polish audit findings (tracked separately; folded in only when touching the same lines).

## Decisions

**D1 — Mission launch is a card action, not a new page.** Add a primary "Launch" button (Next `Link`) to ACTIVE mission cards on the missions page routing to the existing launch route. Alternative considered: launching from the dashboard Operations card — rejected; the missions page is where the user lands after accepting a contract and where the mission list lives.

**D2 — Fund campaigns via preset overrides, not creation-API defaults.** Add positive `startingFunds` to CASUAL/STANDARD/FULL preset overrides and make the wizard pass `applyPreset(...)` output into `createCampaign`. The API-level "minimal parameters → zero balance" behavior stays (it is specified and used by tests/fixtures). Alternative: change `createDefaultCampaignOptions` default — rejected; it would silently change every existing test fixture and the CUSTOM preset contract.

**D3 — Contract pay derives from type + duration.** Give the offer generator a deterministic base-pay formula (per-type base rate × duration multiplier) using the existing `Payment Terms` Money model, and render salvage rights from `salvagePercent` (0 → "None", otherwise the percentage). Exact rates are placeholder constants in one module for later balancing.

**D4 — One roster source of truth for wizard output.** Investigate whether the wizard's `initRoster` pilots fail to persist or the dashboard/readiness read a different store; then make wizard-created pilots land where Force Snapshot and mission readiness read (campaign personnel + roster assignment), and auto-assign the lone pilot to the lone unit at submit time. The investigation is the first task of this workstream because the fix location depends on its outcome.

**D5 — Fix the auto-resolve loop, then report honestly.** First find why `runToCompletion` terminates after 1 turn with reason `turn_limit` (suspects: turn-loop exit condition, recon-objective adjudication, stalemate detection mislabeled). The engine must honor the existing "Battle ends by turn limit" requirement; the new spec adds outcome-integrity requirements (turnsPlayed consistent, `turn_limit` only when the limit was actually reached, distinct reason for early termination). The results banner then renders reason + turn context from the outcome record.

**D6 — Gate the flow shell by environment, keep it for QC.** `GameplayFlowShell` renders only when `NODE_ENV === 'development'` or `NEXT_PUBLIC_E2E_MODE === 'true'` (or an explicit QC query flag). CRITICAL constraint: the existing QC validators and e2e specs assert `gameplay-flow-shell` testids on `/gameplay` — they run with `NEXT_PUBLIC_E2E_MODE=true` via the Playwright webServer env, so gating must key off that flag to keep `qc:ui-flow-shell` lanes green. Player cards move above the shell in all contexts.

**D7 — Table rows use the stretched-link pattern.** An anchor cannot wrap `<tr>`; make the Name cell a Next `Link` stretched across the row (absolute-positioned overlay within a relatively-positioned row), remove the `window.location.href` handler. Grid/list views already use `Link` and only need the spec-conformance check.

**D8 — Key Moments initial visibility.** Render the first N (≥1) moments before the "show more" affordance; when zero moments exist, show an explicit empty message. Root cause is an initial-visible-count of 0 in the results sections component.

## Risks / Trade-offs

- [Engine fix changes shared code paths (campaign auto-resolve, simulations)] → run the BV/combat jest suites and `qc:scenarios` after the engine change; the fix targets loop termination and outcome reporting only, not combat math.
- [Flow-shell gating breaks QC lanes that assert it] → gate on `NEXT_PUBLIC_E2E_MODE` which the Playwright webServer already sets; run `qc:ui-flow-shell:validate` + the e2e specs that reference `gameplay-flow-shell` testids before merge.
- [Placeholder economy values leak into balance expectations] → isolate rates in one constants module with a "placeholder tuning" comment and spec language limited to "greater than 0".
- [Wizard roster fix depends on investigation outcome (D4)] → time-boxed investigation task first; if pilots genuinely persist but consumers read the wrong store, the fix is read-side and smaller than feared.
- [Stretched-link pattern can cover interactive cells added later] → keep the overlay scoped to the Name cell's link with the row as the positioning context; document in the component.

## Migration Plan

Pure application-code change; no schema or data migration. Ship as one PR (or two: engine+results vs UI affordances) on a feature branch; verify with unit tests per fix plus a full `npm run qc:ux-audit` re-run — journey 06 gains an in-UI launch step, and journeys 04/06 become the acceptance evidence. Rollback is a straight revert.

## Open Questions

- Exact placeholder `startingFunds` per preset (proposal: CASUAL > STANDARD > FULL reflecting difficulty; any positive values satisfy the spec).
- Whether early-termination reasons beyond destruction/turn-limit (objective completion, stalemate) already exist in `IGameOutcome.reason`'s type or need a new enum member — resolve during D5 investigation; a new member ripples into the GameEventType QC pins (14-surface ripple noted in project memory).
