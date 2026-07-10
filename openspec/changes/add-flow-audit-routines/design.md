# Design: add-flow-audit-routines

## Context

The walkthrough harness (`e2e/ux-walkthrough-audit.spec.ts`, `e2e/ux-deep-play-audit.spec.ts`, `e2e/helpers/uxWalkthrough.ts` `WalkthroughRecorder`, `scripts/qc/run-ux-walkthrough.mjs`) already produces exactly the evidence format we want (per-step screenshot + route + console errors + manifest + index.html), but it is only invocable as an all-journeys umbrella (or a `-g` title regex), always tears its state down with the per-run isolated DB, runs at fixed viewports, and has no notion of "stop here and let me look." The 2026-07-09 council decision fixed the doctrine: interactive route-mounted audits are the iteration/evidence layer; headless assertion suites are CI authority. This change builds the invocation layer on top of the existing recorder — not a fourth harness.

Implements `specs/flow-audit-routines/spec.md` (new capability) and the `specs/journey-qc/spec.md` delta.

## Goals / Non-Goals

**Goals:**
- Agent/human-invocable per-flow audit runs with checkpoint evidence, `--until`, `--hold`, `--viewport`, `--list`, and a machine-readable summary.
- One flow per subsystem in the initial registry (campaign→launch, battle turn loop, contract→ledger, repair cycle, hiring, pilot XP).
- Reuse: recorder, catalog generator, and `scripts/playwright/run-playwright.mjs` (tracked as of #1020).

**Non-Goals:**
- CI wiring (flow audits gate nothing — spec requirement), scenario packs, headless fast-forward, SP determinism, new Playwright projects, screenshot-diff baselines.

## Decisions

**D1 — Flows are manifest-driven Playwright tests, not a re-slicing of the 10 journeys.**
`e2e/flows/manifest.ts` is the single source of truth: `IFlowDefinition { id, description, subsystems, checkpoints: IFlowCheckpoint[], viewports }`, `IFlowCheckpoint { name, holdSafe }`. A dedicated `e2e/flow-audits.spec.ts` generates one `test()` per flow from the manifest (title = flow id), implementing checkpoints with helpers extracted from the existing journey specs (e.g. the campaign-wizard sequence in the deep-play spec moves to `e2e/helpers/` for shared use). Why not reuse journeys directly: they are persona-shaped and mix subsystems; flows need named checkpoint boundaries and until/hold semantics. The umbrella specs stay untouched (journey-qc delta scenario).
*Alternative considered:* tagging checkpoints inside the existing journey specs — rejected: journey step sequences serve the human-review narrative; overloading them with flow control flags couples two contracts.

**D2 — Checkpoint API extends `WalkthroughRecorder`, selection travels by env var.**
Add `recorder.checkpoint(name, action, opts)` (a `step()` that also registers in a checkpoints array) and a `not-run` status. The runner passes `MEKSTATION_FLOW_ID`, `MEKSTATION_FLOW_UNTIL`, `MEKSTATION_FLOW_VIEWPORT`, `MEKSTATION_FLOW_HOLD` env vars; the spec file reads them at load time (same pattern as `MEKSTATION_UX_WALKTHROUGH_RUN_DIR`). After the `--until` checkpoint completes, remaining checkpoints are recorded `not-run` and the test returns cleanly.

**D3 — Hold mode targets the developer's dev server and only stops at server-persisted checkpoints.**
Two run modes:
- *Default (isolated):* standard webServer flow — per-run DB, full teardown. Evidence catalog is the product.
- *`--hold`:* the runner first probes `http://localhost:3600` and fails loud if no dev server is running (spec scenario). It then runs Playwright with `reuseExistingServer` semantics against that server, so all server-side state (campaign rows, encounters, forces) lands in the developer's own dev DB and survives the run. The runner prints the target URL(s) and created entity ids from the run summary.
Critical honesty point: state created only in the Playwright browser profile (localStorage, IndexedDB match-logs) is **not** visible in the user's own browser. Therefore each checkpoint carries `holdSafe: boolean` in the manifest — true only when the state at that point is server-persisted (campaign saved to server, encounter rows in SQLite). `--hold --until <checkpoint>` on a non-hold-safe checkpoint exits non-zero explaining why (e.g. mid-battle IndexedDB state; wave W4 pack loaders will lift this later). Flows are authored so their major boundaries are hold-safe (e.g. the campaign flow saves to server before the checkpoint fires).

**D4 — Machine-readable summary is a file plus a pointer line.**
The runner writes `<runDir>/summary.json` `{ flowId, catalogDir, viewport, holdUrls?, entityIds?, checkpoints: [{name, status, consoleErrors, pageErrors, durationMs}] }` and prints `FLOW_AUDIT_SUMMARY=<absolute path>` as the last stdout line. Agents parse the file; humans open `index.html`.

**D5 — Viewport presets derive from the canonical breakpoints.**
Presets map to `src/constants/layout.ts` BREAKPOINTS: `mobile` = 375×667 + hasTouch, `tablet` = 768×1024, `desktop` = 1440×1000 (default, matching existing journeys). `WxH` strings are accepted verbatim. The value is recorded in the run manifest and each checkpoint record (recorder already persists `testInfo.project.use.viewport`; extend to the env-supplied override).

**D6 — Runner reuses the walkthrough runner's catalog generation.**
`scripts/qc/run-flow-audit.mjs` extracts/imports the manifest+index.html+REVIEW generation from `scripts/qc/run-ux-walkthrough.mjs` (factor shared pieces into `scripts/qc/lib/` if a direct import is awkward) and delegates the Playwright spawn to `scripts/playwright/run-playwright.mjs`. `--list` reads the manifest via `npx tsx` (or a generated JSON mirror) without launching a browser.

## Risks / Trade-offs

- [Hold mode can't expose browser-local state] → `holdSafe` flags per checkpoint + loud refusal; flows authored to persist server-side before checkpoint boundaries; W4 scenario packs are the long-term lift.
- [Flow helpers drift from journey specs] → checkpoints implemented with the same shared helpers the journeys use (extraction task); registry validation task cross-checks manifest ids against spec test titles (validate-qc-registry pattern).
- [Hold mode pollutes the developer's dev DB] → intentional (that is the feature); summary.json lists every created entity id so cleanup is one delete per id; default mode stays fully isolated.
- [Env-var plumbing races with Playwright config collection] → read env at spec-file load (proven pattern in this repo); never mutate config mid-run.
- [Scope creep toward CI gating] → spec requirement forbids PR-blocking wiring; runner exits 0 on graded findings (only infra errors exit non-zero, mirroring run-ux-walkthrough).

## Migration Plan

Purely additive: new manifest, new spec file, new runner, one recorder extension, one npm script. No existing journey, script, or CI behavior changes. Rollback = delete the new files and the `qc:flow` script entry.

## Open Questions

- None blocking. (Implementer may choose per-flow spec files over one generated spec file if test isolation demands it; contract is unchanged.)
