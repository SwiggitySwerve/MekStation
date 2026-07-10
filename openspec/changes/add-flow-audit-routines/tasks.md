# Tasks: add-flow-audit-routines

## 1. Shared Helper Extraction

- [x] 1.1 Extract the campaign-wizard, contract-accept, and mission-launch step sequences currently inlined in `e2e/ux-deep-play-audit.spec.ts` into reusable helpers under `e2e/helpers/` (no behavior change); re-run the deep-play journeys to prove the umbrella output is byte-equivalent in structure (journey-qc delta: "Umbrella run remains intact").

## 2. Recorder Checkpoint API

- [x] 2.1 Extend `WalkthroughRecorder` (`e2e/helpers/uxWalkthrough.ts`) with `checkpoint(name, action, opts)` — a recorded step that also registers into an ordered checkpoints array — plus a `not-run` status for checkpoints skipped by `--until` (spec: Checkpoint Evidence Capture, Until Semantics). Persist checkpoints and the effective viewport into the per-journey JSON and run manifest.
- [x] 2.2 Add run-summary support to the recorder/finish path: per-checkpoint status + console/page error counts + created entity ids (flows push ids as they create campaigns/encounters), consumable by the runner for `summary.json` (spec: Machine-Readable Run Summary).

## 3. Flow Manifest and Flow Spec

- [ ] 3.1 Create `e2e/flows/manifest.ts` with `IFlowDefinition` / `IFlowCheckpoint` (id, description, subsystems, checkpoints with `holdSafe`, viewports) and register the six initial flows: campaign-create-to-launch, battle-turn-loop, economy-contract-to-ledger, maintenance-repair-cycle, personnel-hiring, pilot-xp-progression (spec: Flow Registry, Subsystem Flow Coverage). Include startup validation that rejects duplicate ids and zero-checkpoint flows.
- [ ] 3.2 Create `e2e/flow-audits.spec.ts` generating one `test()` per manifest flow (title = flow id), implementing checkpoints via the extracted helpers; read `MEKSTATION_FLOW_ID` / `MEKSTATION_FLOW_UNTIL` / `MEKSTATION_FLOW_VIEWPORT` / `MEKSTATION_FLOW_HOLD` at spec-load time; apply the design's viewport presets (mobile 375×667+touch / tablet 768×1024 / desktop 1440×1000 default, from `src/constants/layout.ts` BREAKPOINTS); implement until-skip as `not-run` checkpoints (spec: Flow-Audit Runner Invocation, Until Semantics, Viewport Selection).

## 4. Runner

- [ ] 4.1 Create `scripts/qc/run-flow-audit.mjs`: `--list` (enumerate flows/checkpoints without a browser), flow-id arg validation (unknown id → non-zero + valid list), `--until` checkpoint validation, `--viewport <preset|WxH>`, catalog generation reusing the `run-ux-walkthrough.mjs` machinery (factor shared manifest/index.html/REVIEW generation into `scripts/qc/lib/` if needed), Playwright spawn via `scripts/playwright/run-playwright.mjs`, `summary.json` + final `FLOW_AUDIT_SUMMARY=<path>` stdout line, and the `qc:flow` package.json script (spec: Flow Registry, Flow-Audit Runner Invocation, Machine-Readable Run Summary).
- [ ] 4.2 Implement `--hold` mode: probe the dev server on port 3600 and fail loud when absent; run against the existing server (no per-run DB env, no teardown of created state); enforce `holdSafe` on the stop checkpoint with a non-zero, explanatory refusal otherwise; print live URL(s) + created entity ids in the summary (spec: Hold Mode for Local Inspection).

## 5. Validation, Docs, and Verification

- [ ] 5.1 Add a registry cross-check validator (`scripts/qc/validate-flow-audit.mjs` + jest wrapper): manifest flow ids ↔ `flow-audits.spec.ts` test titles, checkpoint uniqueness per flow, every subsystem tag covered by ≥1 flow (spec: Flow Registry, Subsystem Flow Coverage). After any validator/spec edits, run oxfmt + the validator + its jest wrapper together (known formatter quote-flip race).
- [ ] 5.2 Stamp the authority-split statement into generated run output (manifest/REVIEW header identifies catalogs as review evidence, never a CI gate) for both `qc:flow` and `qc:ux-audit` runs (journey-qc delta: Interactive Evidence and CI Authority Split; spec: Flow Audits Are Evidence, Never CI Gates). Confirm no CI workflow references `qc:flow`.
- [ ] 5.3 Document the capability: README/docs-qc section covering `npm run qc:flow -- <id>`, `--list/--until/--hold/--viewport`, the hold-safe rule, and the machine summary contract for agents.
- [ ] 5.4 Verify end-to-end: `npm run build` + lint + affected jest suites green; `npx openspec validate add-flow-audit-routines --strict` passes; live proof — run one flow at desktop and mobile viewports (two catalogs with correct manifests), one `--until` run showing `not-run` checkpoints, one `--hold` refusal without a dev server, and a full `qc:ux-audit` umbrella run proving it is unchanged.
