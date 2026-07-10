# MekStation Flow-Audit Routines

Date: 2026-07-10

Flow-audit routines are single-command, per-flow interactive UX audits. Each
flow drives one named, checkpointed path through the real browser UI (create
a campaign, run a battle turn, accept a contract, etc.) and writes a
reviewable evidence catalog scoped to exactly that flow — without launching
the full `qc:ux-audit` umbrella (all journeys, ~10+ minutes) when you only
need to look at one thing.

Flow-audit routines are additive on top of the existing UX walkthrough
harness (`e2e/ux-walkthrough-audit.spec.ts`, `e2e/ux-deep-play-audit.spec.ts`,
`WalkthroughRecorder`, `scripts/qc/run-ux-walkthrough.mjs`). They reuse that
harness's recorder and catalog-generation machinery rather than introducing a
second evidence format — a flow-scoped catalog and an umbrella catalog have
the same `manifest.json` / `index.html` / `REVIEW.md` shape.

## Authority Split

**Flow-audit and UX-walkthrough catalogs are review evidence for humans and
agents. They are never PR-blocking CI gates.** Assertion-based suites (unit,
integration, e2e assertions, and — once they land — headless invariant nets)
remain the source of permanent authority for CI. A flow-audit run with
failed checkpoints or console errors informs review and backlog triage; it
does not flip any PR-blocking check. `.github/workflows/` contains no
reference to `qc:flow` or `qc:ux-audit` — confirmed by grep as part of this
capability's own registry validation work.

This statement is also stamped into every generated catalog's `manifest.json`
(`authorityNotice` field), `index.html` (banner under the page title), and
`REVIEW.md` (blockquote under the title) by `scripts/qc/run-ux-walkthrough.mjs`,
so a reviewer opening the artifact directly — without this doc — still sees
it.

## Sources

- Flow registry (single source of truth): `e2e/flows/manifest.ts`
- Flow implementation (checkpoints, one Playwright `test()` per flow): `e2e/flow-audits.spec.ts`
- Per-flow runner: `scripts/qc/run-flow-audit.mjs`
- Registry cross-check validator: `scripts/qc/validate-flow-audit.mjs`
- Umbrella UX-walkthrough runner (shared catalog machinery): `scripts/qc/run-ux-walkthrough.mjs`
- Flow-scoped evidence root: `.sisyphus/evidence/flow-audit/<runId>/`
- Umbrella evidence root: `.sisyphus/evidence/ux-walkthrough/<runId>/`

## Commands

```powershell
npm.cmd run qc:flow -- --list
npm.cmd run qc:flow -- campaign-create-to-launch
npm.cmd run qc:flow -- campaign-create-to-launch --until contract-accepted
npm.cmd run qc:flow -- campaign-create-to-launch --viewport mobile
npm.cmd run qc:flow -- campaign-create-to-launch --hold
npm.cmd run qc:flow:validate
npm.cmd run qc:flow:validate -- --json
npm.cmd run qc:ux-audit
npm.cmd run qc:ux-audit:deep
npm.cmd run qc:ux-audit:prod
```

## Registered Flows

One flow per gameplay subsystem tag (spec: Subsystem Flow Coverage). `--list`
prints this table live from `e2e/flows/manifest.ts`, so treat the table below
as a reading aid, not the source of truth.

| Flow id                      | Subsystem   | What it drives                                                            |
| ---------------------------- | ----------- | ------------------------------------------------------------------------- |
| `campaign-create-to-launch`  | navigation  | Wizard → save → starmap → accept contract → mission launch briefing       |
| `battle-turn-loop`           | combat      | Saved campaign → pre-battle → manual battle → initiative/first-movement   |
| `economy-contract-to-ledger` | economy     | Save → accept contract → advance a day → finances ledger renders          |
| `maintenance-repair-cycle`   | maintenance | Save → seed repair tickets → repair-bay queue → advance a day re-projects |
| `personnel-hiring`           | personnel   | Save → seed hiring hall → hire a candidate → personnel roster updates     |
| `pilot-xp-progression`       | experience  | Create a standalone pilot → pilot detail → career/XP surface              |

## Flags

- **`--list`** — enumerate every registered flow, its subsystem tag(s), and
  its ordered checkpoint names. Exits 0 without launching a browser.
- **`--until <checkpoint>`** — stop the flow immediately after the named
  checkpoint completes; later checkpoints are recorded `not-run` rather than
  skipped-silently. Fails loud (non-zero, before any browser launches) if the
  checkpoint name is not on the selected flow.
- **`--viewport <preset|WxH>`** — `mobile` (375×667, touch), `tablet` (768×1024),
  or `desktop` (1440×1000, default). An explicit `WxH` value (e.g. `1024x900`)
  is accepted verbatim. The resolved viewport is recorded in the run manifest
  and every checkpoint record, so a mobile and a desktop run of the same flow
  produce two independently reviewable catalogs.
- **`--hold`** — see below.

## The Hold-Safe Rule

`--hold` targets your own already-running dev server instead of an
isolated per-run database, and leaves whatever the flow created in place
instead of tearing it down — so you can open the app in your own browser
afterward and look at exactly the state the flow reached.

Two things follow from that:

1. **You must start the dev server yourself, in exactly one specific mode,
   before running `--hold`.** The runner probes
   `http://localhost:3600/__playwright_e2e_ready__?runId=mekstation-flow-hold`
   before spawning anything; if nothing answers with the right token, it
   refuses (rather than silently letting Playwright's `webServer` kill
   whatever is already on port 3600):

   ```powershell
   $env:NEXT_PUBLIC_E2E_MODE = 'true'
   $env:PLAYWRIGHT_E2E_RUN_ID = 'mekstation-flow-hold'
   npm.cmd run dev
   ```

   This must be the plain `node server.js` dev script (`npm run dev`), not
   `npm run dev:e2e`, which bypasses the readiness handler the probe needs.

2. **Not every checkpoint is safe to hold at.** Some flow state only ever
   exists in the Playwright browser profile (mid-battle IndexedDB match log,
   an unsaved wizard step) — closing that browser context, which the runner
   always does, destroys it. So it would never be visible if you opened your
   own browser afterward. Every checkpoint in `e2e/flows/manifest.ts`
   declares `holdSafe: true` only when the state reached there is
   server-persisted (saved campaign, accepted contract row, hired pilot on
   disk). `--hold` enforces `holdSafe` on the _stop_ checkpoint — the flow's
   final checkpoint, or the `--until` one — and refuses with a non-zero exit
   and the list of that flow's hold-safe checkpoints if it isn't. For
   example, `battle-turn-loop`'s `pre-battle-roster` is hold-safe;
   `battle-mounted` and everything after it is not, because manual-battle
   session state lives only in the browser.

`--hold` never tears down or deletes what it created — cleanup (if you want
it) is one delete per id, using the entity ids the runner prints and writes
into `summary.json`.

## Machine-Readable Run Summary (for agents)

Every invocation ends by writing `<runDir>/summary.json` and printing its
absolute path as the last line of stdout:

```text
FLOW_AUDIT_SUMMARY=E:\Projects\MekStation\.sisyphus\evidence\flow-audit\2026-07-10T18-22-33\summary.json
```

An agent should read that last stdout line rather than scraping
human-oriented log text. The file shape:

```json
{
  "flowId": "campaign-create-to-launch",
  "catalogDir": "<absolute path to the run directory>",
  "viewport": "desktop",
  "holdUrls": [
    {
      "label": "campaign-saved",
      "url": "http://localhost:3600/gameplay/campaigns/..."
    }
  ],
  "entityIds": [{ "kind": "campaign", "id": "..." }],
  "checkpoints": [
    {
      "name": "wizard-complete",
      "status": "ok",
      "consoleErrors": [],
      "pageErrors": [],
      "durationMs": 1234
    }
  ]
}
```

`holdUrls` and `entityIds` are present only for `--hold` runs. Checkpoint
`status` is one of `ok`, `failed`, or `not-run` (the last only after
`--until`). `catalogDir/index.html` is the human-reviewable contact sheet;
`catalogDir/REVIEW.md` is a reviewer skeleton with the authority-split
statement at the top.

## Registry Validator

`npm run qc:flow:validate` (`scripts/qc/validate-flow-audit.mjs`) is a
static, non-browser-launching cross-check between the manifest and its
implementation. It catches drift that would otherwise only surface as a
runtime "no stage implementation registered" error, and only for the one
flow you happened to run. It checks:

1. No duplicate flow ids; no flow with zero checkpoints.
2. No duplicate checkpoint names within a single flow.
3. Every one of the six subsystem tags (`navigation`, `combat`, `economy`,
   `maintenance`, `personnel`, `experience`) is covered by at least one flow.
4. Every manifest flow id has a matching implementation in
   `e2e/flow-audits.spec.ts`'s `FLOW_STAGES` table, and vice versa (no
   orphaned spec entries for flows the manifest no longer declares).
5. Per flow, every manifest checkpoint has a matching stage runner in the
   spec, and vice versa.
6. The spec still generates its tests via
   `for (const flow of FLOW_MANIFEST)`, so generated Playwright test titles
   keep tracking the manifest ids (design D1: title = flow id).

Add `--json` for a machine-readable `{ status, flowCount, subsystemCoverage,
errors, warnings }` report. Exit code is non-zero only when `errors` is
non-empty; `warnings` do not fail the run.

## Relationship to the UX-Walkthrough Umbrella

`qc:ux-audit` (and its `:deep` / `:prod` variants) runs every registered
journey in `e2e/ux-walkthrough-audit.spec.ts` and
`e2e/ux-deep-play-audit.spec.ts` and aggregates them into one catalog under
`.sisyphus/evidence/ux-walkthrough/<runId>/` — the broad, persona-shaped
regression sweep. `qc:flow` is the narrow, checkpoint-shaped complement: pick
one subsystem flow, optionally stop partway (`--until`) or hold state open
for inspection (`--hold`), at any supported viewport, without waiting on the
other journeys. Both runners share the same recorder
(`e2e/helpers/uxWalkthrough.ts`'s `WalkthroughRecorder`) and the same catalog
generator (`aggregateManifest` / `writeIndexHtml` / `writeReviewSkeleton` in
`scripts/qc/run-ux-walkthrough.mjs`), so anything that reads one catalog
format (including the authority-split stamp above) reads both.
