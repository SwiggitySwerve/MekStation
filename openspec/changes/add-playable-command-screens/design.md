## Context

MekStation already has the main surfaces for a playable BattleTech campaign loop: the tactical game route renders `GameplayLayout` with `HexMapDisplay` and `TacticalActionDock`, the campaign shell exposes missions, starmap, bays, finances, contract market, and GM ledger, the starmap route can update `campaign.currentSystemId`, the mission launch route can materialize an encounter, the Mech Bay can start a refit order, and the customizer route owns full unit editing.

Those surfaces are not yet a unified command experience. Travel is a one-click location mutation without route/time/cost preview. Mission launch uses broad deployability and simplified encounter materialization. The Mech Bay starts narrow refit orders but does not round-trip through the full customizer with campaign identity. The GM ledger exists for campaign interventions, but tactical combat does not expose a matching intervention lane in the active hex command shell.

MegaMek and MekHQ are reference lessons for correctness and campaign depth, not layout targets. The product direction is a Civilization-like command surface: central map or state workspace, compact status strip, contextual inspector, action dock, ledger/log, and progressive rule explanations that keep the player in context.

## Goals / Non-Goals

**Goals:**

- Define a shared command-screen grammar used by combat, campaign travel, mission readiness, Mek stable, customizer handoff, and GM intervention screens.
- Keep maps as the primary workspace while surrounding panels explain legal actions, consequences, invalid reasons, and committed state changes.
- Make all major actions preview-before-commit with a resulting-state summary, useful logs, and reload-proof persistence tests.
- Route GM actions through a ledger-backed interface that supports private rationale, player-visible net effects, cascade preview, and manual takeover when automatic reconciliation conflicts.
- Split implementation into independently verifiable slices: command contract, tactical map, mission readiness/stable, customizer handoff, starmap logistics, GM ledger integration, logging/QC.

**Non-Goals:**

- Replacing the current Next.js route structure or campaign navigation with a separate game shell.
- Recreating MegaMek or MekHQ screens directly.
- Solving all unsupported non-BattleMech units in this change.
- Treating UI-visible success as sufficient proof without validating persisted campaign/combat state.

## Decisions

### Decision: Introduce a shared command context model instead of one-off screen state

Every screen in scope should expose the same conceptual flow: select subject, inspect current state, preview command, show legal/illegal reasons, commit, log, and persist. The implementation should use narrow adapters around existing stores/routes rather than a global rewrite.

Illustrative type shape:

```ts
interface ICommandScreenContext<TSubjectId extends string = string> {
  readonly screenId: string;
  readonly subjectId: TSubjectId | null;
  readonly authority: 'player' | 'owner-gm' | 'host-gm';
  readonly phase?: string;
  readonly preview?: ICommandPreview;
  readonly ledgerEntries: readonly ICommandLedgerEntry[];
}

interface ICommandPreview {
  readonly commandId: string;
  readonly isLegal: boolean;
  readonly reasons: readonly ICommandReason[];
  readonly before: ICommandStateSummary;
  readonly after: ICommandStateSummary;
  readonly costs: readonly ICommandCost[];
  readonly warnings: readonly string[];
}
```

Rationale: combat, travel, readiness, refit, and GM intervention all need the same "what happens if I commit?" affordance. A shared contract prevents the screens from drifting while allowing each domain to keep its own engine/store.

Alternative rejected: build five bespoke command panels first. That would look faster but would multiply preview, invalid reason, redaction, and logging semantics.

### Decision: Keep tactical combat as the first complete vertical slice

The active game route already has the richest projection and command anchors. Start by making the combat map prove the contract end to end: selected unit, movement/combat preview, invalid reasons, commit, action log, and tactical GM entry point.

Rationale: combat is the most immediate expression of the product's rules-backed promise and will reveal whether projection/commit agreement is real.

Alternative rejected: start with the campaign starmap because it is visually simpler. Travel logistics depends on time, finance, repairs, contracts, and persistence working together, so it is a broader first slice.

### Decision: Treat mission readiness as the bridge between campaign and combat

Mission readiness should become the launch gate. It must show mission constraints, selected roster, eligible/ineligible reasons, pilot/unit readiness, and the exact force that materialization will use.

Illustrative type shape:

```ts
interface IMissionReadinessProjection {
  readonly campaignId: string;
  readonly missionId: string;
  readonly selectedUnitIds: readonly string[];
  readonly eligibleUnits: readonly IDeploymentEligibility[];
  readonly blockers: readonly ICommandReason[];
  readonly launchPreview: ICommandPreview;
}
```

Rationale: the current `getDeployableUnits()` path treats every non-destroyed unit as deployable and materialization can fall back to stock units. A readiness projection is the right place to make roster composition explicit and testable.

### Decision: Make starmap travel a logistics command, not a button handler

Travel should calculate a route against a named rules/config layer, show each jump leg, legality, elapsed days, expected arrival date, travel fees, daily upkeep, repair/medical progress implications, contract deadline impact, and activity/finance ledger entries before commit.

Illustrative type shape:

```ts
interface ITravelLogisticsPreview {
  readonly fromSystemId: string;
  readonly toSystemId: string;
  readonly route: readonly ITravelLeg[];
  readonly isLegal: boolean;
  readonly arrivalDate: string;
  readonly fundsDelta: number;
  readonly dailyCostTotal: number;
  readonly contractDeadlineWarnings: readonly string[];
}
```

Rationale: BattleTech-style faster-than-light travel has hard distance constraints, and campaign decisions are about time and solvency as much as location.

### Decision: Customizer handoff uses campaign refit semantics

Campaign-origin editor launches should preserve `campaignId`, `unitId`, `missionId` or `returnTo`, current campaign date, budget, inventory/refit constraints, and canonical unit identity. Saving from this mode should produce either a refit order/campaign delta or a clear blocker; cancel returns without mutation.

Rationale: players need to fix readiness blockers without losing the campaign flow or accidentally free-building a disconnected unit.

### Decision: GM authority is a command lane over the same state

GM controls should not become a separate cheat console. The GM lane uses the intervention ledger abstraction, cascade preview, approval, manual takeover fallback, public/private projection, and redaction policy.

Rationale: the GM is highest authority for owned games, but that authority must still be auditable and must not leak hidden rationale into player views.

### Decision: Co-op and multiplayer authority use the same command projections

Co-op campaign and networked tactical play should not invent a second authority model. Hosts act as the authoritative campaign/game owner and may approve, veto, or GM-correct where the campaign/session grants that authority. Guests submit intents/proposals or operate owned units through validated host commit paths, then receive public result projections.

Rationale: host/guest sync already depends on authoritative validation and replay. Reusing command previews, redaction, and ledger metadata gives co-op the same UI/UX and audit language as solo GM play while preserving guest mirrors.

Alternative rejected: keep co-op as a special-case proposal queue unrelated to command screens. That would preserve older architecture but make the most important table flow, GM interjection during shared play, the hardest path to validate.

## Risks / Trade-offs

- [Risk] Scope expands into a full UI rewrite -> Mitigation: keep current routes and build adapters/screen contracts around them.
- [Risk] Preview and commit drift -> Mitigation: require shared projection data or shared service calls, plus tests comparing previewed and committed effects.
- [Risk] Travel cascade becomes hard to reason about -> Mitigation: implement route preview as a pure projection first, then commit through the same day/cost processors with day-by-day reports.
- [Risk] Readiness blocks feel punitive -> Mitigation: every blocker must link to the relevant fix surface such as repair, medical, acquisitions, personnel, or customizer/refit.
- [Risk] GM manual overrides hide bugs -> Mitigation: GM actions must include private rationale, before/after diffs, public net effect, and explicit manual-takeover classification.
- [Risk] UI density crowds the map -> Mitigation: use compact panels, lenses, inspectors, and action docks that preserve the map/starmap as the primary workspace at desktop and laptop widths.

## Migration Plan

1. Add command-screen types, preview/reason vocabulary, logging event names, and QC journey definitions without changing current behavior.
2. Convert tactical combat to the shared command context and prove preview/commit agreement.
3. Add mission readiness projection and roster selection before materialization.
4. Add campaign-origin customizer handoff and return validation.
5. Replace starmap direct travel commit with logistics preview plus commit.
6. Wire tactical, campaign, co-op, and multiplayer GM/host authority into the shared command lane with redaction tests.
7. Expand E2E scripts and section validators, then archive the change after strict OpenSpec validation and browser persistence proof pass.

## Open Questions

- What exact default BattleTech jump distance, transit time, and travel fee tables should ship first? The code should use named constants/config so the values can be source-backed and revised without UI rewrites.
- Which mission constraint dimensions are required for the first playable launch gate: tonnage, Battle Value, unit count, unit class, pilot status, damage/readiness, employer restrictions, or all of them?
- Should the first customizer handoff save full unit config deltas immediately, or only create refit orders until repair/refit time simulation is more complete?
