# Design: extend-ux-audit-deep-play-journeys

## Technical Approach

Extend the existing UX walkthrough audit harness in place; do not replace it. Three seams:

1. **Recorder** (`e2e/helpers/uxWalkthrough.ts`) gains three capabilities — a capture-tolerant step mode, a structured findings channel, and multi-surface capture — added without changing the existing strict `step()` / `note()` / `finish()` contract the seven shell journeys depend on (`e2e/ux-walkthrough-audit.spec.ts`).
2. **Journeys** land in a new spec `e2e/ux-deep-play-audit.spec.ts` so the two-client fixture shape (Playwright `browser` + two contexts + API vault seeding) stays out of the single-`page` shell spec, and so the deep-play spec can be run alone.
3. **Runner** (`scripts/qc/run-ux-walkthrough.mjs`) runs both spec files under one run id, aggregates findings into `manifest.json`, and emits a `REVIEW.md` skeleton next to the existing `manifest.json` + `index.html`.

Ground truth for the journey step sequences, routes, and the blockers each journey will encounter is the 2026-07-07 playtest report (`.sisyphus/evidence/playtest/2026-07-07-live-playtest/REVIEW.md`). The multiplayer two-client mechanics mirror the proven `e2e/multiplayer-live-vault-auth.spec.ts` (identity seeding via `/api/e2e/vault-identity`, two `browser.newContext()` clients, room-code join, lobby seat assertions).

## Architecture Decisions

### Decision: D1 — Capture tolerance is a step mode, not a new recorder

**Choice**: Add an options flag to `WalkthroughRecorder.step()` (e.g. `{ tolerant: true }`) — or a sibling `softStep()` — that runs the same capture/settle/screenshot path but, on failure, records `status: 'failed'` + failure message + failure screenshot + buffered console/page errors and returns instead of rethrowing.
**Rationale**: The recorder already writes full failure evidence before it rethrows (`uxWalkthrough.ts:143-163`): failure screenshot via `capture(\`${slug}-FAILED\`)`, `record.failure`, and the console/page buffers flushed in `finally`. Tolerance is exactly that path minus the `throw`. Reusing it keeps one capture code path and preserves the strict behavior the shell journeys rely on.
**Alternatives considered**: A separate tolerant recorder class — rejected as duplicated capture logic that would drift from the strict path.

### Decision: D2 — Findings are recorder state, aggregated by the runner

**Choice**: Add `recorder.finding({ id, severity, summary, steps })` that pushes onto a per-journey findings array serialized into the journey JSON by `finish()` (alongside `steps`). The runner's `aggregateManifest()` sums findings into `manifest.totals` and carries the per-journey findings through to `REVIEW.md` and `index.html`.
**Rationale**: The journey JSON is already the runner's aggregation input (`run-ux-walkthrough.mjs:101-146` reads `journeys/*.json` and flattens `steps`). Findings ride the same channel with no new file contract. Finding ids are author-chosen strings (e.g. the playtest's `C1`..`C5`, `M1`..`M5`) so a reviewer maps a screenshot straight to the blocker taxonomy.
**Alternatives considered**: Deriving findings from failed steps automatically — rejected; a finding is an interpretation (which blocker, what severity) that the journey author states explicitly, and one finding may span several steps or none of them failed (e.g. a display-only success that is still wrong).

### Decision: D3 — Co-op journey runs under the durable-store harness config and records the divergence

**Choice**: The two-client journey runs under the existing Playwright webServer, which sets `MULTIPLAYER_STORE=durable` and `NEXT_PUBLIC_E2E_MODE=true` (`playwright.config.ts:152-164`). It does NOT add a second in-memory-store webServer variant to reproduce the plain-`npm run dev` `1008 unknown-match` handshake failure (playtest C3). Instead it captures whatever the durable-store transport produces and records a finding noting the store-config divergence.
**Rationale**: The C3 failure is a config artifact, not a code bug in the socket layer: on plain `npm run dev` the REST route bundle and the socket server hold separate `InMemoryMatchStore` instances (`src/lib/multiplayer/server/getDefaultMatchStore.ts` selects `DurableMatchStore` vs `InMemoryMatchStore`), so the socket can't find REST-created matches; under the harness the durable store is shared and the handshake completes — which is exactly why `multiplayer-live-vault-auth.spec.ts` passes. Forcing the audit onto the in-memory config to reproduce a known store-parity bug is store-parity testing, not a UX audit, and it would need webServer env plumbing this change deliberately avoids. Capture tolerance still covers a real regression: if the durable-store path breaks, the journey records it.
**Alternatives considered**: A `--multiplayer-store=memory` webServer override to mirror the real player's `npm run dev` — rejected as out of scope; filed as a follow-up for a dedicated store-parity test. This is the primary open question surfaced to the team lead.

### Decision: D4 — Guest identity via the E2E vault seam, not the Settings UI

**Choice**: The co-op journey provisions both identities through `/api/e2e/vault-identity` (the locked E2E-only seam, available because the harness sets `NEXT_PUBLIC_E2E_MODE=true`), exactly as `multiplayer-live-vault-auth.spec.ts` does (`seedIdentity`, `deleteIdentities`, cleaned up in `finally`).
**Rationale**: The playtest (M5) showed the UI enforces one vault identity per server, so a guest client cannot mint its own identity through the Settings vault flow — the e2e suite already solves this with API seeding. The journey still drives the public host/join/lobby UI for capture; only identity provisioning uses the seam. Identity ids are deleted in `finally` so the audit leaves no vault residue.
**Alternatives considered**: Driving Settings → Vault & Sharing for both identities — rejected; blocked by the one-identity-per-server model and would itself become an M5 finding rather than a working two-client setup.

### Decision: D5 — Deep-play spec is separate; the runner runs both, selection via Playwright `-g`

**Choice**: Add `e2e/ux-deep-play-audit.spec.ts`. In `run-ux-walkthrough.mjs`, replace the single spec argument (`run-ux-walkthrough.mjs:52`) with both spec paths. Keep passing `...extraArgs` through to Playwright so `-g <regex>` selects a single journey. Add a `qc:ux-audit:deep` npm script that runs the runner with only the deep-play spec (a new `--deep` runner flag or a spec filter), and document the `-g` pass-through.
**Rationale**: The runner already forwards `extraArgs` to the Playwright CLI (`run-ux-walkthrough.mjs:36,49-57`) and Playwright supports title-grep selection. The two spec files share one `MEKSTATION_UX_WALKTHROUGH_RUN_DIR`, so both write into the same per-run catalog and the manifest aggregates across both — the umbrella contract holds.
**Alternatives considered**: Appending the deep-play journeys into the shell spec — rejected; the `browser`/two-context fixture and API seeding do not fit the single-`page`, per-describe-viewport shape of the shell spec, and mixing them would make selective runs and timeouts harder to reason about.

### Decision: D6 — Assert only today-true invariants; everything else is a finding

**Choice**: Deep-play steps assert only that a screen renders or a control is reachable (the invariants that hold now). Broken outcomes — Initiative soft-lock (C1), display-only GM advance (C2), co-op handshake (C3), roster collapse (C4), starmap crash (C5) — are captured and recorded as findings, never asserted.
**Rationale**: The journeys must pass while the blockers exist (proposal Non-goals), so the harness stays green and the findings, not test failures, carry the audit signal. When a blocker is fixed, the journey captures the fixed flow with no code change; only the reviewer's REVIEW.md interpretation changes.

### Decision: D7 — GM journey grounds on the authority model and documents its param-only entry

**Choice**: The GM journey (`10-gm-surfaces`) captures GM interventions against the known authority model and records engine/campaign state before and after each approval so a display-only intervention is provable, not assumed. GM tactical mode is entered by the `?gm=1` / `?mode=gm` query param, and the journey documents that entry explicitly because no UI toggle exists. The co-op guest read-only ledger check (D4 journey, guarded on join success) is grounded on the same authority model: a co-op guest is a `player`, not a `gm`.
**Rationale**: `src/lib/campaign/campaignAuthority.ts` fixes the roles — single-player-owner → `gm`, coop-host → `gm`, coop-guest → `player` (`CampaignViewerRole = 'gm' | 'player'`). `src/pages-modules/gameplay/games/gmTacticalInterventionSurface.ts:44-46` resolves shell mode to `'gm'` only when `query.mode === 'gm' || query.gm === '1' || query.gm === 'true'` — param-only, confirming the playtest's MODERATE finding that there is no GM entry affordance. Capturing the tactical engine phase before and after GM approval turns C2 (display-only advance) into recorded evidence: the turn rail flips to MOVEMENT while the real InteractiveSession phase never leaves Initiative. The time-cascade correction preview must be captured expanded so the per-projected-day ordered summaries (one summary per day plus changed-state refs) are in the screenshot, not collapsed.
**Alternatives considered**: Asserting the GM approve actually mutates engine state — rejected; that is the C2 spec violation the journey must *record*, not assert, or the journey would fail while the bug exists (violates D6).

## Data Flow

```
qc:ux-audit (run-ux-walkthrough.mjs)
  ├─ sets MEKSTATION_UX_WALKTHROUGH_RUN_DIR=<runDir>
  ├─ Playwright webServer (playwright.config.ts): npm run dev @3600
  │     NEXT_PUBLIC_E2E_MODE=true, MULTIPLAYER_STORE=durable, per-run DBs
  ├─ e2e/ux-walkthrough-audit.spec.ts   (7 shell journeys, strict steps)
  └─ e2e/ux-deep-play-audit.spec.ts     (3 deep-play journeys, tolerant steps)
        each journey → WalkthroughRecorder
           step()/softStep() → <runDir>/<journey>/NN-*.png
           finding(...)       → journey record.findings[]
           finish()           → <runDir>/journeys/<journey>.json  (steps + findings)
  └─ on exit: aggregateManifest() → manifest.json (+ findings totals)
              writeIndexHtml()    → index.html (+ findings)
              writeReviewSkeleton() → REVIEW.md   (journeys · steps · findings · placeholders)
```

## File Changes

- **Modified**: `e2e/helpers/uxWalkthrough.ts` — add tolerant step mode (D1), `finding()` + `findings` on the journey record (D2), multi-surface registration + per-surface console/page buffers + per-step surface tag (D3/multi-client). Extend `WalkthroughJourneyRecord` / `WalkthroughStepRecord` types accordingly.
- **New**: `e2e/ux-deep-play-audit.spec.ts` — three deep-play journeys (`08-sp-campaign-deep-loop`, `09-coop-multiplayer-two-client`, `10-gm-surfaces`).
- **Modified**: `scripts/qc/run-ux-walkthrough.mjs` — run both spec files under one run id, aggregate findings into `manifest.totals`, add `writeReviewSkeleton()`, support a deep-only mode.
- **Modified**: `package.json` — add `qc:ux-audit:deep`; keep `qc:ux-audit` / `qc:ux-audit:prod` as the umbrella.
- **Reference (read, not modified)**: `e2e/multiplayer-live-vault-auth.spec.ts` (two-client + vault-seam pattern), `playwright.config.ts` (webServer env), `.sisyphus/evidence/playtest/2026-07-07-live-playtest/REVIEW.md` (step sequences, routes, blockers, including the "Spec cross-reference (GM)" section), `src/pages/gameplay/campaigns/[id]/gm-ledger.tsx` + `src/components/campaign/coop/` (GM ledger + co-op surfaces), `src/lib/campaign/campaignAuthority.ts` (authority model: SP-owner/coop-host → `gm`, coop-guest → `player`), `src/pages-modules/gameplay/games/gmTacticalInterventionSurface.ts:44-46` (`resolveGameSessionShellMode` — param-only GM entry).
