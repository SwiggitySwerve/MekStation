## 1. Remove dead hook and component modules

- [x] 1.1 Prove each target has no production importer on fresh origin/main
      (static, dynamic, barrel, story, e2e, jest lists, QC registries).
- [x] 1.2 Delete the modules, their tests and the unreferenced
      `TacticalAccessibility/` directory; update the hook barrels, the jest
      no-jest-dom list and `src/components/AGENTS.md`.
- [x] 1.3 Record the REMOVED requirement deltas for the affected capabilities.
- [ ] 1.4 Run both tsc configs, lint:units, root lint, oxfmt and openspec
      validate; obtain hosted green.
