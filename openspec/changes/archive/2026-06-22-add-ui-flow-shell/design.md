## Context

Journey QC already defines the required end-to-end scenarios and writes evidence for character build, BattleMech build, 1v1 combat, 4v4 combat, contract campaign, short campaign, and long campaign flows. The gameplay UI has route surfaces for pilots, forces, campaigns, encounters, active games, victory/review/replay, repair, salvage, starmap, finances, and campaign logs, but there is no single UI map that shows how those surfaces compose into the validated player and GM flows.

The UI flow shell is a thin coordination layer: it does not own campaign state, combat resolution, or GM ledger mutation. It exposes route and QC alignment so users can start, continue, or inspect the same flows the journey runner validates.

## Goals / Non-Goals

**Goals:**

- Provide a typed gameplay flow registry for the seven required journey IDs.
- Render a gameplay hub section that shows each flow's ordered route checkpoints, primary action, GM review intent, and QC command.
- Validate the UI flow registry against the journey catalog and validation graph.
- Keep the shell usable without requiring an existing campaign or encounter ID by using template placeholders where runtime IDs are needed.

**Non-Goals:**

- Add new campaign, combat, economy, salvage, repair, or time cascade mechanics.
- Replace existing gameplay route implementations.
- Require browser-backed journey execution for every journey.
- Add new external dependencies or persistence schemas.

## Decisions

1. **Use a static registry with a typed TypeScript wrapper instead of deriving UI routes from docs JSON at runtime.**

   The UI needs typed labels, phases, route placeholders, roles, and action affordances. Keeping that in TypeScript gives compile-time safety and avoids importing docs-only JSON into the Next.js client bundle as a source of truth. The validator reads both sides and fails on drift.

   Alternative considered: render directly from `docs/qc/mekstation-journey-scenarios.json`. Rejected because the catalog describes QC execution, not operator UX labels or route placeholders.

2. **Render the shell on `/gameplay` instead of creating another top-level route first.**

   The gameplay hub is already the launch point for quick games, pilots, forces, campaigns, encounters, and games. Adding the flow shell there makes the path discoverable without changing existing route ownership.

   Alternative considered: add `/gameplay/flows`. Rejected for this wave because it adds route sprawl before the hub proves useful.

3. **Validate route placeholders by matching page templates, not by requiring concrete IDs.**

   Campaign, encounter, mission, and game routes naturally contain IDs. The registry records placeholder routes such as `/gameplay/campaigns/:campaignId/salvage`; the validator normalizes them against Next.js page templates such as `/gameplay/campaigns/[id]/salvage`.

   Alternative considered: point all shell links only to list pages. Rejected because the user needs to understand the full flow, including ID-bound inspection surfaces.

4. **Keep GM controls as inspection intent in this wave.**

   GM ledger and combat intervention behavior already has separate specs. This shell identifies where GM review/override surfaces belong in the flow, but the detailed cascade controls remain owned by GM ledger and later campaign intervention waves.

## Risks / Trade-offs

- **Registry can drift from journey catalog** -> Add a validator and include it in `qc:journeys:validate`.
- **Placeholder links could confuse users if treated as clickable runtime links** -> Render placeholders as route checkpoints and only make concrete entry routes clickable.
- **Gameplay hub could become too dense** -> Use compact flow rows grouped by module and keep existing hub cards intact.
- **Long campaign remains headless-first** -> Keep this visible as a QC note and do not imply full browser parity until later waves add it.

## Migration Plan

1. Add the UI flow registry and shell component.
2. Mount the shell on the gameplay hub.
3. Extend QC validation to check required journey coverage, graph nodes, and route templates.
4. Add focused unit/script tests.
5. Archive the OpenSpec change after verification passes.

Rollback is removing the shell mount, registry, validator checks, and spec delta; no stored data changes are involved.

## Open Questions

- Should `/gameplay/flows` become a dedicated expanded route once the shell grows beyond hub-sized inspection?
- Which later GM intervention wave should replace route placeholder checkpoints with concrete campaign/session-aware deep links?
