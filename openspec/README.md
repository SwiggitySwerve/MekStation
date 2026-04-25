# OpenSpec (MekStation)

Source-of-truth specs, change tracking, and planning for the OpenSpec workflow (`openspec` CLI). See `config.yaml` for project context passed to the tooling.

## Layout

| Path | Purpose |
|------|---------|
| **`specs/`** | Canonical specifications (`specs/<name>/spec.md`). Index: `specs/README.md`. |
| **`changes/`** | Active changes — one directory per in-flight change (kebab-case). |
| **`changes/archive/`** | Completed changes. Folders are typically prefixed with `YYYY-MM-DD-` for sorting. |
| **`planning/`** | Long-running roadmaps: `PHASE-*-EXECUTION-PLAN.md` (not OpenSpec “changes,” but spec-linked execution plans). |
| **`templates/`** | OpenSpec templates and `TEMPLATE_GUIDE.md`. |
| **`scripts/`** | Terminology and validation helpers (`scripts/README.md`). |
| **`.sessions/`** | OpenSpec CLI session state (checked in for continuity; safe to ignore locally if your workflow differs). |
| **Root** | `config.yaml`, `TERMINOLOGY_GLOSSARY.md`, validation summaries — workspace metadata. |

## Conventions

- **New work**: `openspec new change "<kebab-name>"` → materializes under `changes/<kebab-name>/`.
- **Archive**: When a change is finished, it belongs under `changes/archive/` with a date prefix, not a second top-level `archive/` tree.
- **Execution plans** live in `planning/`, not mixed with `changes/`, so `changes/` only contains real OpenSpec change directories plus `archive/`.
