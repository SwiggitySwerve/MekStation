# Tasks: extend-ux-audit-deep-play-journeys

> Sequential implementation (repo standing policy: Codex implements one bounded task at a time, no parallel fan-out). Each task is self-contained and ends with a QA check. Waves are ordered — a later wave depends on the earlier one.

## 1. Recorder foundation (harness capabilities)

- [x] 1.1 Add capture-tolerant step mode to `WalkthroughRecorder.step()` in `e2e/helpers/uxWalkthrough.ts` (an options flag such as `{ tolerant?: boolean }`, or a sibling `softStep()`). On failure in tolerant mode: record `status: 'failed'`, `failure`, the `-FAILED` screenshot, and flush the console/page buffers exactly as the strict path does — but return instead of rethrowing. Strict mode (existing signature) MUST still rethrow.
  - Acceptance: a tolerant step whose action throws records failure evidence and does not throw; a strict step whose action throws still throws (per spec `Capture-Tolerant Walkthrough Steps`).
  - QA: `npx tsc --noEmit` clean on the helper; a throwaway spec with one tolerant failing step + one following step confirms both steps land in the journey JSON.

- [x] 1.2 Add a structured findings channel: `recorder.finding({ id, severity, summary, steps })` pushing onto a per-journey `findings` array, serialized by `finish()` alongside `steps`. Extend `WalkthroughJourneyRecord` (and any needed `Finding` type) in `e2e/helpers/uxWalkthrough.ts`.
  - Acceptance: `<journey>.json` contains a `findings` array with id, severity, summary, and step references; a journey that records none serializes `findings: []` (per spec `Structured Journey Findings`).
  - QA: `npx tsc --noEmit` clean; throwaway spec asserts a recorded finding appears in the journey JSON.

- [x] 1.3 Add multi-surface capture: let a journey register additional named surfaces (e.g. `recorder.attachSurface('guest', page)`), buffer console/page errors per surface, and let `step()`/`softStep()` take a surface selector so the action runs against and screenshots the chosen page; tag each step record with its surface. Keep the default single-surface (`page` from the constructor) behavior unchanged for existing callers.
  - Acceptance: a two-surface journey produces one interleaved journey record whose steps identify their surface, with per-surface console/page errors attaching to the right steps (per spec `Multi-Surface Journey Capture`).
  - QA: `npx tsc --noEmit` clean; throwaway two-context spec confirms host and guest steps interleave in one JSON with distinct surface tags.

## 2. Runner: findings aggregation + REVIEW.md skeleton

- [x] 2.1 In `scripts/qc/run-ux-walkthrough.mjs`, aggregate findings: extend `aggregateManifest()` so `manifest.totals` includes a findings count and each journey in the manifest carries its `findings`. Surface findings in `writeIndexHtml()` (a findings block per journey section).
  - Acceptance: after a run with recorded findings, `manifest.json` totals include the findings count and `index.html` shows them; a run with zero findings still writes valid artifacts.
  - QA: run the throwaway deep spec through the runner; inspect `manifest.json` + open `index.html`.

- [x] 2.2 Add `writeReviewSkeleton(manifest)` to `scripts/qc/run-ux-walkthrough.mjs` that writes `<runDir>/REVIEW.md` after the journeys run, listing every journey (status), its steps, and its recorded findings (id · severity · summary · evidence screenshots), with review placeholders (e.g. TL;DR, per-finding verdict) for a human to complete. Call it from the `exit` handler next to `writeIndexHtml()`; write it even when a journey did not finish cleanly.
  - Acceptance: each run produces `REVIEW.md` reflecting the run, including partial journeys and their findings (per spec `Per-Run REVIEW.md Skeleton`).
  - QA: run the runner; confirm `REVIEW.md` exists and lists journeys/steps/findings; force a tolerant failure and confirm the skeleton still lands.

## 3. Runner: dual-spec execution + selection

- [x] 3.1 In `scripts/qc/run-ux-walkthrough.mjs`, run BOTH `e2e/ux-walkthrough-audit.spec.ts` and `e2e/ux-deep-play-audit.spec.ts` under one run id (replace the single spec arg at the `runnerArgs` construction). Add a deep-only mode (e.g. a `--deep` flag) that runs only the deep-play spec. Keep `...extraArgs` forwarding so Playwright `-g <regex>` selects a single journey.
  - Acceptance: `qc:ux-audit` runs both specs into one catalog; deep-only mode runs just the deep-play spec; `-g` narrows to one journey (per spec `Deep-Play Journey Selection`). (The deep spec file may not exist until Wave 4 — until then this task is verified with a temporary empty deep spec or by pointing at the shell spec twice, then finalized in 5.1.)
  - QA: `npm run qc:ux-audit -- -g "first visit"` runs a single journey; deep-only mode resolves to the deep spec path.

- [x] 3.2 Add the `qc:ux-audit:deep` script to `package.json` (runner in deep-only mode); leave `qc:ux-audit` and `qc:ux-audit:prod` as the umbrella. Document the `-g` selection pass-through in a comment at the top of `run-ux-walkthrough.mjs`.
  - Acceptance: `npm run qc:ux-audit:deep` exists and runs only the deep-play journeys.
  - QA: `npm run` lists the new script; a dry invocation resolves the correct spec.

## 4. Deep-play journeys (new spec `e2e/ux-deep-play-audit.spec.ts`)

- [x] 4.1 Journey `08-sp-campaign-deep-loop` (single client, tolerant steps). Follow the playtest C1/C4/C5/M-series sequence: `/gameplay/campaigns` → New Campaign wizard (name, type Mercenary, preset Standard, roster 4 units + 4 pilots with assignments, review) → dashboard → contract market accept → missions → launch → select 4 units → Launch mission → pre-battle → Play Manually → attempt unit select + move (capture the Initiative soft-lock / unhandled error, record finding `C1`) → back out → auto-resolve path → victory/result → sweep missions, dashboard, finances, personnel, forces, mech bay, starmap (record `C5` on starmap crash) → Advance Day → ledger check. Record `C4` for roster collapse in the pre-battle handoff.
  - Acceptance: journey runs green while the blockers exist; captures the battle attempt and the full campaign sweep; records findings for the blockers it hits; no hard assertion on broken outcomes (per spec `Single-Player Campaign Deep-Play Journey`). Reuse the shell spec's journey-06 wizard selectors as the starting reference.
  - QA: `npm run qc:ux-audit:deep -- -g "sp campaign"`; confirm the catalog shows the battle-attempt and sweep screenshots and the journey passes.

- [x] 4.2 Journey `09-coop-multiplayer-two-client` (two contexts, tolerant steps, multi-surface). Seed two vault identities via `/api/e2e/vault-identity` and clean them up in `finally` (mirror `e2e/multiplayer-live-vault-auth.spec.ts`). Host: campaigns → Create Co-op Campaign → capture room code. Guest: Join Co-op Campaign with the code → capture join outcome; record a finding describing the resulting connection state (note the durable-store harness config per design D3). **Guest read-only ledger (guarded on join success, per design D4/D7):** when the guest connected, the guest navigates directly to `/gameplay/campaigns/<id>/gm-ledger` and the journey captures the view and records a finding for whether it is read-only — public summaries present, no approve/preview controls, no GM-private fields, surviving a reload (authority model: coop-guest is `player`, `src/lib/campaign/campaignAuthority.ts`); skip (do not fail) this check when the guest did not connect. Then `/multiplayer` 1v1: host mints token → creates match → guest joins by room code → capture lobby seat state on both clients; record a finding when either client does not reach an occupied-seat lobby.
  - Acceptance: two contexts drive host/join for both co-op and 1v1; join/lobby outcomes captured on both surfaces; guest read-only ledger check runs when join succeeded and is skipped otherwise; findings recorded instead of hard assertions on a successful session; identities deleted in `finally` (per spec `Two-Client Multiplayer Deep-Play Journey`).
  - QA: `npm run qc:ux-audit:deep -- -g "coop"`; confirm both surfaces appear in the interleaved journey, the guest-ledger step runs or skips per join state, and the run passes; confirm no leftover E2E identities.

- [x] 4.3 Journey `10-gm-surfaces` (single client, tolerant steps). Campaign GM ledger (`/gameplay/campaigns/<id>/gm-ledger`): generate a correction → approve the cascade → capture the Player Action Log vs GM Ledger redaction split; run the conflict variant that blocks approval and capture the blocked state. **Time-cascade correction:** when generating a time-advance correction, capture the preview *expanded* so the per-projected-day ordered summaries (one summary per day plus changed-state refs) are in the screenshot, not collapsed. Then the `?gm=1` battle GM dock: document the entry point explicitly (GM mode is param-only — `resolveGameSessionShellMode` accepts `?gm=1` / `?mode=gm` / `?gm=true`, `src/pages-modules/gameplay/games/gmTacticalInterventionSurface.ts:44-46`; no UI toggle exists). **Record the engine phase before approval**, then Advance Phase (GM) preview → approve → **record the engine phase after approval** and a finding (`C2`) stating whether the tactical engine phase actually changed vs. only the turn-rail display (per design D7 — a display-only advance is proven, not assumed).
  - Acceptance: captures the ledger redaction split, the conflict-blocked approval, and the expanded time-cascade per-day preview; documents the param-only GM entry it used; captures the GM dock advance-and-approve with engine phase before/after and records the `C2` finding on whether the engine phase changed; no hard assertion on commit behavior that is currently display-only (per spec `GM Surfaces Deep-Play Journey`).
  - QA: `npm run qc:ux-audit:deep -- -g "gm surfaces"`; confirm ledger, expanded time-cascade preview, and GM-dock before/after screenshots and a recorded `C2` finding; journey passes.

## 5. Wiring + verification

- [x] 5.1 Finalize the runner dual-spec wiring against the real `e2e/ux-deep-play-audit.spec.ts` (remove any temporary placeholder from 3.1); confirm both specs share one run id and one aggregated catalog.
  - Acceptance: `npm run qc:ux-audit` produces one catalog covering all ten journeys (7 shell + 3 deep-play).
  - QA: run `npm run qc:ux-audit`; manifest journey count and `REVIEW.md` cover all ten.

- [x] 5.2 Typecheck, lint, and format the touched harness files.
  - Acceptance: `npm run typecheck`, `npm run lint`, and `npm run format:check` clean on `e2e/helpers/uxWalkthrough.ts`, `e2e/ux-deep-play-audit.spec.ts`, `scripts/qc/run-ux-walkthrough.mjs`. (Respect the repo formatter — the double-quote hook then oxfmt: run format after edits.)
  - QA: paste the clean command output into the PR.

- [x] 5.3 Full deep-play run: `npm run qc:ux-audit:deep`. Confirm all three journeys pass (they must not fail on the current blockers), the per-run catalog + `manifest.json` + `index.html` + `REVIEW.md` all generate, and the recorded findings map to the expected screenshots.
  - Acceptance: 3 deep-play journeys run; findings for C1/C2/C4/C5 and the co-op connection state present in `manifest.json` and `REVIEW.md`; attach the run folder path to the PR.
  - QA: open `REVIEW.md` and `index.html`; verify each finding references real screenshots.

- [x] 5.4 Umbrella regression: `npm run qc:ux-audit`. Confirm the seven shell journeys still pass unchanged and the deep-play journeys run in the same catalog; confirm no console errors regressed on the shell journeys.
  - Acceptance: shell journeys green as before; combined catalog covers all ten journeys.
  - QA: compare shell-journey status to the prior baseline run; attach the combined run folder path.

## Final Verification Wave

- [x] F1 Typecheck + lint + format clean across all touched files (5.2 evidence).
- [x] F2 `npm run qc:ux-audit:deep` passes with all three journeys green and full catalog + REVIEW.md (5.3 evidence).
- [x] F3 `npm run qc:ux-audit` umbrella run passes with all ten journeys in one catalog and no shell-journey regression (5.4 evidence).
- [x] F4 `npx openspec validate extend-ux-audit-deep-play-journeys --strict` passes.
- [x] F5 omo-spec-verifier confirms every SHALL/MUST in the `journey-qc` delta has covering journey/scenario evidence (map each ADDED requirement to the journey step or runner artifact that proves it).
