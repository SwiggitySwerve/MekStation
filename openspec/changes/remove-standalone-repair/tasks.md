## 1. Remove the standalone repair bay

- [x] 1.1 Prove each target has no production importer on fresh origin/main
      (static, dynamic, barrel, story, e2e, route manifests, nav links, jest
      lists, QC registries).
- [x] 1.2 Delete the route, page stack, components, store and types with their
      tests; remove the e2e store exposure, spec, page object and fixtures.
- [x] 1.3 Update the app-shell manifest, proof spec, layout-sweep inventory and
      guard counts, the audit-capture and integration cases, and the jest list.
- [x] 1.4 Record the REMOVED requirement deltas for `repair`.
- [ ] 1.5 Run both tsc configs, lint:units, root lint, oxfmt, openspec validate,
      validate-qc-registry, qc-registry.test and the layout-sweep guard; obtain
      hosted green.
