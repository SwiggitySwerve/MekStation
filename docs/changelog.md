---
title: Documentation Changelog
description: Tracks migrations from docs-old to the new docs set.
---

## 2025-XX-XX – Docs Refresh

| Legacy File (docs-old)                               | New Location / Notes                               |
|------------------------------------------------------|----------------------------------------------------|
| `battletech/agents/00-08*.md`                        | Consolidated into `docs/rules.md`                  |
| `battletech/battletech_construction_guide.md`        | Superseded by `docs/rules.md`                      |
| `battletech/battletech_validation_rules.md`          | Superseded by `docs/rules.md` and operations guide |
| `battletech/rules_implementation_map.md`             | Key sections merged into `docs/rules.md`           |
| `architecture/ComponentUpdateArchitecture.md`        | Referenced in `docs/architecture.md` (historical)  |
| `architecture/SpecialComponentManagerConsolidation.md` | See `docs/architecture.md`                         |
| `analysis/*`, `archive/*`, `testing/*`, etc.         | Archived under `docs-old/`; retained for history   |
| `testing/customizer-validation-checklist.md`         | Summary moved to `docs/operations.md`              |
| `guidelines/*`, `implementation/*`                   | Relevant sections summarized in architecture/operations |
| `README.md`, `analysis/`, `implementation/`, `project-history/`, etc. | Entire tree moved under `docs-old/` for archival  |

> **Reminder:** Do not delete files from `docs-old/` unless we explicitly mark them as redundant. Instead, update this changelog with the new canonical location.

