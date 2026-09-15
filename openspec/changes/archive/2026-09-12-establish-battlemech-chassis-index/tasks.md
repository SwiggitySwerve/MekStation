## 1. Chassis foundation

- [x] 1.1 Add typed chassis contracts, explicit aliases, and a validated deterministic builder covering identity and metadata requirements.
- [x] 1.2 Add server-only catalog loading and read-only API with request and failure boundaries.
- [x] 1.3 Add searchable Compendium browsing, URL selection, canonical variant navigation, and empty/error states.

## 2. Verification and handoff

- [x] 2.1 Run real-catalog completeness, identity, and API regression tests.
- [x] 2.2 Verify live navigation, alias search, selection reload, filters, variant links, and mobile layout.
- [x] 2.3 Run typecheck, lint, scoped formatting, and strict OpenSpec checks; document the extension boundary and remaining limitations.

Evidence: all 18 focused tests and nine live browser/API checks passed; final repository typecheck, scoped formatting/lint, strict change validation, and OpenSpec CI contracts passed. See docs/audits/2026-09-10-chassis-index/README.md. The change remains active and uncommitted.
