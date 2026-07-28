# OpenSpec

## OVERVIEW

- `specs/` is the canonical live capability set. `changes/` holds active deltas; `changes/archive/` is dated historical evidence.
- `planning/` contains roadmaps, not apply-ready change packages. `.sessions/` preserves CLI continuity.

## STRUCTURE

- `specs/<capability>/spec.md`: current requirements.
- `changes/<kebab-name>/`: proposal, design, delta specs, and tasks for in-flight work.
- `changes/archive/YYYY-MM-DD-<name>/`: completed history, excluded from live terminology scope.
- `scripts/`: purpose, terminology, and quality validators.
- `active-change-ledger.json`: allowed active-change inventory.

## WHERE TO LOOK

- Project context: `config.yaml`; terminology: `TERMINOLOGY_GLOSSARY.md`.
- Active state: ledger plus actual non-archive directories; reconcile both before reporting.
- Current validators: `scripts/terminology-tool.ts`, `scripts/spec-purpose-lint.ts`, and `../scripts/qc/validate-openspec-ci-quality.mjs`.
- Dated `VALIDATION_FINDINGS_SUMMARY.md`, `VIOLATIONS_REPORT.md`, and audit reports are evidence snapshots, not live authority.

## CONVENTIONS

- Keep capability names and active change names kebab-case; link proposals/designs to affected canonical specs.
- Create new work with `openspec new change "<name>"`; preserve the generated package shape.
- Synchronize canonical specs after implementation lands, then archive only after required verification is recorded.
- Treat validator exclusions and strict-mode behavior as contracts; record unresolved gaps explicitly.
- Preserve `.sessions/`; update the glossary deliberately when terminology changes.

## ANTI-PATTERNS

- Do not edit task checkboxes, archive a change, or claim implementation completion without runtime evidence.
- Do not use archived changes or dated summaries as live requirements.
- Do not create a second archive tree, hand-edit validation output, or bypass strict checks with ad hoc scans.
- Do not silently change runtime code, CI, or data without the corresponding OpenSpec delta.

## COMMANDS

- Inventory: `openspec.cmd list --json`.
- Focused: `npx openspec validate <name> --strict`; full: `openspec.cmd validate --all --strict`.
- `npm.cmd run spec:purpose:validate:strict`, `npm.cmd run terminology:validate:strict`, `npm.cmd run qc:openspec-ci:validate`.
