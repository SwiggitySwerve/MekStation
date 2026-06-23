## Context

The archived `add-long-campaign-stability-gate` change already added the headless long-campaign stability runner. The current gap is protection and discoverability: `verify:qc:campaign-long` existed but was not called by `verify:qc`, and the QC registry only referenced the stability command indirectly under broader GM ledger surfaces.

## Goals / Non-Goals

**Goals:**

- Make long-campaign stability a first-class QC surface.
- Fail fast when package scripts, registry metadata, journey catalog bounds, UI flow linkage, validation graph nodes, or source anchors drift.
- Run the existing 10-contract, 2-run stability proof through the global `verify:qc` lane.
- Keep the browser boundary explicit: UI checkpoints are linked, but the stability runner remains headless.

**Non-Goals:**

- Add browser automation for a full 6-10 contract campaign.
- Change campaign economy, salvage, repair, market, time-cascade, or combat domain behavior.
- Replace the existing long-campaign stability runner or evidence format.

## Decisions

1. Add a dedicated metadata validator instead of expanding the stability runner.

   The stability runner should remain focused on executing the long campaign and producing repeatability evidence. A separate validator can cheaply inspect wiring, registry, graph, catalog, UI shell, and source anchors without creating another evidence bundle.

2. Wire `verify:qc` to `verify:qc:campaign-long`.

   The smallest reliable global gate is to call the existing verification command from `verify:qc`. That command now composes the metadata validator and the long-campaign stability runner.

3. Add the 10-contract maximum to the journey catalog.

   The stability command already enforces 6-10 contracts. Declaring the maximum in the catalog keeps the public scenario contract and runner validation aligned.

4. Keep active change refs empty in the committed registry surface.

   The validator rejects stale active refs. The registry should point to durable specs, commands, and evidence rather than an active change name that will become stale after archive.

## Risks / Trade-offs

- Running `verify:qc` now includes a deterministic long-campaign execution. This adds a small amount of runtime but gives the global gate real repeatability proof.
- The metadata validator can fail on intentional file moves. That is useful pressure: the moved source needs to update the corresponding QC anchor.
- Browser execution remains out of scope. The UI flow linkage and manifest boundary must continue to state `browserExecuted=false` until a separate browser lane exists.
