# Documentation (v2)

The legacy documentation set now lives in `docs-old/`. This folder contains the new, curated references that align with the current mech customizer and mech lab implementation.

## Files

| File            | Description                                                      |
|-----------------|------------------------------------------------------------------|
| `rules.md`      | Authoritative BattleTech construction & validation rules.        |
| `architecture.md` | System architecture, state stores, mechanics layer overview.  |
| `operations.md` | Developer workflow, lint/test requirements, manual validation.  |
| `changelog.md`  | Mapping of legacy docs (docs-old) to the new consolidated set.  |

## Working with Legacy Docs

- Historical documents remain under `docs-old/`. Consult them for context, but update only the new `docs/` files unless explicitly requested.
- When deprecating or summarizing a legacy document, add an entry to `docs/changelog.md` describing where the new information lives.

## Contribution Checklist

1. Update the relevant file(s) in this folder.
2. If you retire or supersede a legacy doc, record it in `changelog.md`.
3. Run `npm run lint` (code) and applicable Jest suites if your change touches referenced behavior.
4. Mention documentation updates in your PR summary.

