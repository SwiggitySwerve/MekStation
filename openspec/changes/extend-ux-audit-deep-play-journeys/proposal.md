# Proposal: extend-ux-audit-deep-play-journeys

## Why

The UX walkthrough audit harness (`npm run qc:ux-audit`) walks shell-level journeys — navigation, compendium browsing, quick-game auto-resolve, wizard-to-launch — but it stops at the doorway of actual play. The 2026-07-07 live playtest (`.sisyphus/evidence/playtest/2026-07-07-live-playtest/REVIEW.md`) had to be driven by hand through headless Chrome and two manual browser clients to find the five critical blockers that now define the play loop: the single-player battle soft-locks in Initiative (C1), GM Advance Phase is display-only (C2), all networked multiplayer fails the socket handshake on `npm run dev` (C3), the mission roster collapses to one pilotless placeholder in the campaign→encounter handoff (C4), and the starmap crashes (C5). None of these live inside a step the current harness exercises.

There is no repeatable command to re-audit the deep play loop after each dev wave. Every re-audit is a hand-driven session. This change extends the existing harness with three DEEP-PLAY journeys — single-player campaign deep loop, two-client co-op / multiplayer, and GM surfaces — so one `npm run qc:ux-audit` produces the same per-run screenshot catalog plus a REVIEW.md skeleton that already contains the journey/step/finding scaffold a reviewer fills in.

The core discipline is **capture tolerance**: the deep-play journeys record findings and keep capturing through soft failures instead of dying on the first broken step. A journey that hits today's Initiative soft-lock screenshots it, records the console error, notes the finding, and continues to the auto-resolve path — and when the blocker is later fixed, the same journey naturally captures the fixed flow with no rewrite.

## What Changes

- **Capture-tolerant step recording**: the walkthrough recorder gains a soft-step mode that records a failing step's screenshot, console/page errors, and a finding without rethrowing, so a journey walks past a known blocker and keeps cataloging downstream screens.
- **Structured findings**: the recorder gains a findings channel (id, severity, summary, evidence step references) so a journey can pin an observed blocker (e.g. `C1` Initiative soft-lock) to the exact screenshots that prove it; findings roll up into the run manifest and the review artifacts.
- **Multi-surface capture**: the recorder can attach and screenshot more than one page in a single journey record, so a two-client co-op / 1v1 flow tells one interleaved host/guest story instead of two disjoint files.
- **Three deep-play journeys** in a new spec `e2e/ux-deep-play-audit.spec.ts`: (1) SP campaign deep loop through battle attempt, auto-resolve, and the full campaign sweep; (2) two-client co-op campaign join plus `/multiplayer` 1v1 lobby; (3) GM campaign ledger cascade plus the `?gm=1` battle dock.
- **REVIEW.md skeleton generation**: the runner emits a per-run `REVIEW.md` scaffold alongside `manifest.json` and `index.html`, pre-populated with each journey's steps and recorded findings for the reviewer to complete.
- **Umbrella + selection**: `qc:ux-audit` stays the umbrella and now runs both the shell spec and the deep-play spec; a `qc:ux-audit:deep` convenience script and a documented Playwright `-g` pass-through allow running a single deep-play journey.

No production application code changes. No breaking changes to the existing shell journeys or their catalog.

## Capabilities

### New Capabilities

_None — this extends the existing `journey-qc` capability._

### Modified Capabilities

- `journey-qc`: the UX walkthrough audit SHALL support capture-tolerant soft steps, structured per-journey findings, multi-surface capture, and a generated per-run REVIEW.md skeleton; and SHALL include three deep-play journeys (SP campaign deep loop, two-client co-op / multiplayer, GM surfaces) that record current-broken behavior as findings rather than failing the run.

## Impact

- **Code (test harness only)**: `e2e/helpers/uxWalkthrough.ts` (soft-step, findings, multi-surface), new `e2e/ux-deep-play-audit.spec.ts`, `scripts/qc/run-ux-walkthrough.mjs` (spec list, findings aggregation, REVIEW.md skeleton), `package.json` scripts (`qc:ux-audit:deep`). No `src/` changes.
- **Specs**: delta spec for `journey-qc` merges into `openspec/specs/journey-qc/spec.md` on completion.
- **Evidence**: each run writes the existing catalog plus `REVIEW.md`; the deep-play journeys write findings into `manifest.json`.
- **Server config dependency**: the deep-play journeys run under the existing Playwright webServer (`playwright.config.ts`), which sets `NEXT_PUBLIC_E2E_MODE=true` (E2E vault seam) and `MULTIPLAYER_STORE=durable`. The co-op journey therefore exercises the durable-store transport, which does NOT reproduce the plain-`npm run dev` split-store `1008` handshake failure (C3); the journey records that config divergence as a finding. See design.md Decision D3.

## Non-goals

- **Fixing any playtest blocker** (C1–C5, M1–M5). This change makes the blockers re-auditable with one command; the fixes are separate changes. The journeys must pass (not fail) while the blockers exist, by recording them as findings.
- **Hard assertions on currently-broken outcomes.** Deep-play journeys assert only the invariants that hold today (a screen renders, a control is reachable); broken outcomes are captured, never asserted.
- **A second in-memory-store webServer variant** to reproduce the C3 `1008` handshake under plain `npm run dev`. That is store-parity testing, not UX audit — track separately (design.md Decision D3).
- **Reworking the existing seven shell journeys** or the `qc:journeys` domain-backed runner (`scripts/qc/run-journey-scenarios.mjs`) — a different harness.
- **Balancing, copy, or polish findings** surfaced by the playtest (MODERATE list) beyond recording them where a journey step naturally passes over them.
