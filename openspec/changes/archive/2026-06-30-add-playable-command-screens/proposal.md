## Why

MekStation has the core tactical, campaign, starmap, bay, customizer, mission launch, and GM ledger surfaces, but they still feel like adjacent tools rather than one playable command experience. This change makes the main screens explain what can happen next, what it will cost, what will change after commit, and how GM authority can intervene without hiding state corruption or private decisions from the wrong audience.

## What Changes

- Add a cross-screen playable command contract for the combat map, campaign starmap, mission readiness, Mek stable, customizer return path, and GM ledger.
- Make the combat screen map-first: legal actions, invalid reasons, movement/combat projections, and GM intervention entry points must agree with the same rules-backed engine state that commit uses.
- Make the campaign starmap a logistics planner instead of a bare destination picker: routes must respect a configurable BattleTech jump limit, show time passage, downstream upkeep/travel costs, route legality, and the persisted result before commit.
- Add a mission readiness command flow that turns the Mek stable into a deployment planner: mission limits, eligible/ineligible reasons, selected roster, pilot/unit readiness, and exact encounter handoff are visible before launch.
- Preserve campaign and mission context when moving from readiness or bay screens into the customizer/editor, then return with deployment validation refreshed.
- Wire GM interventions as ledger-backed command actions across combat and campaign contexts: preview cascade, approve or take manual control, commit, redact player-visible summaries, and preserve private GM details.
- Add validation scripts and E2E journeys that prove the screen flows survive reloads and that canonical state, logs, command previews, and committed outcomes agree.
- No breaking API changes are intended.

## Non-goals

- Do not replace the existing campaign navigation shell, tactical game route, starmap canvas, customizer route, or GM ledger route with a parallel app shell.
- Do not clone MegaMek or MekHQ UI layouts; use them as rules/logistics lessons while keeping MekStation smoother, map-forward, and lower-friction.
- Do not add unsupported non-BattleMech runtime behavior as part of this change. Unsupported unit systems must remain explicit gaps or separate matrices.
- Do not hard-code a single lore number directly into UI components; jump limits and logistics assumptions must come from a named, testable rules/config layer.

## Capabilities

### New Capabilities

- `playable-command-screens`: Defines the shared command-screen contract for map-first command context, preview-before-commit consequences, screen-to-screen continuity, GM authority lanes, player redaction, and reload-proof validation across tactical and campaign play.

### Modified Capabilities

- `tactical-map-interface`: Combat map overlays and action previews must become the primary explanation layer for legal/illegal movement, combat, terrain, elevation, LOS, and GM intervention opportunities.
- `starmap-interface`: Starmap selection and travel controls must become route/logistics planning with jump legality, route explanation, time/cost preview, and persisted post-travel state.
- `campaign-command-ui`: Campaign screens must act as a coherent command console where starmap, missions, bays, finance, and logs reveal current state and next actions without blocking the main map/context.
- `campaign-system`: Campaign travel must apply current-system, date/time, activity-log, and downstream campaign consequences through one validated action path.
- `campaign-finances`: Travel and time-passage previews must include upkeep/travel cost projections and compare previewed costs to committed ledger entries.
- `day-progression`: Multi-day travel and time cascades must be callable by logistics planning and report day-by-day consequences.
- `campaign-bay-ui`: The Mek stable must expose mission-ready status, repair/refit/customizer actions, and deployment consequences rather than only roster health rows.
- `customizer-routing`: Campaign-origin editor launches must preserve return context and refresh campaign/mission deployment validation after save or cancel.
- `mission-contracts`: Mission launch must use explicit readiness constraints and deploy roster selection instead of a broad "not destroyed" roster handoff.
- `gm-tactical-command-surface`: Combat GM controls must be reachable from the tactical command context with the same preview/approve/commit ledger pattern used elsewhere.
- `gm-campaign-intervention-boundaries`: Campaign GM interventions must preview cascade effects, support manual takeover when automatic reconciliation conflicts, and commit through the campaign ledger.
- `gm-authority-redaction`: Player-visible logs must show only net outcomes while private GM decision context remains owner/host-only.
- `intervention-ledger-abstraction`: The ledger interface must support cross-domain command metadata, cascade previews, reversal/repair actions, redaction policy, and resulting-state summaries.
- `coop-campaign-sync`: Co-op campaign command surfaces must map host/guest authority into the shared command model so hosts approve/veto/GM-correct and guests propose actions or view public outcomes only.
- `multiplayer-game-surface`: Networked tactical game screens must expose host/guest command authority, GM controls, and player mirror views through the same command dock and visibility rules.
- `multiplayer-sync`: Network sync must replicate authoritative command and GM intervention results with redacted public payloads and reconnect/replay parity.
- `logging-system`: Important command paths must emit useful, tested logs for preview, rejection, commit, reload, and intervention outcomes.
- `journey-qc`: Automated QC must cover the playable screen flows end to end for combat, starmap logistics, mission readiness, customizer return, GM intervention, and campaign persistence.

## Impact

- Affected UI routes/components include the game route and tactical command dock, `HexMapDisplay`, campaign starmap page, `StarmapDisplay`, campaign navigation/shell, mission launch page, Mech Bay, customizer routing/editor, and GM campaign ledger/control plane.
- Affected domain/state systems include campaign travel actions, day advancement, daily costs, mission materialization, roster readiness, campaign persistence, intervention ledger types/implementers, logging, and QC journey scripts.
- Validation impact includes new or expanded unit/component tests for logistics, readiness, redaction, ledger preview/commit, and browser E2E flows that verify persisted canonical state after reload.
