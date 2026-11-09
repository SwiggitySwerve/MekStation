## 1. Regression evidence

- [x] 1.1 Extend the existing file-import hook test to require preview recovery,
      retained preview and file, cleared importing state, and a successful retry.
- [x] 1.2 Extend the string and conflict-resolution suite to require idle or
      preview recovery as appropriate, preserved failures, and the error fallback.
- [x] 1.3 Record the failing tests before changing runtime code.

## 2. Recovery behavior

- [x] 2.1 Route returned failures through the existing `failureStep` while
      preserving the result and error and retaining success/conflict behavior.
- [x] 2.2 Record passing regressions and a killed `complete`-on-failure mutant.

## 3. Validation and delivery

- [x] 3.1 Run complete hook and integration test directories, both TypeScript
      configs, root lint, lint:units and its Jest suite, formatting, OpenSpec
      checks, and the deterministic CI budget check.
- [ ] 3.2 Open a draft PR with the preview-loading blank interval documented as
      out of scope; make it ready only after hosted CI is green.
