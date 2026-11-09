## 1. Reproduce the lifecycle failures

- [x] 1.1 Extend `src/hooks/__tests__/useQuickResolve.test.ts` with cancellation,
      reset, replacement, stale progress/error, and unmount scenarios; record red.

## 2. Implement UI Abort Signal Binding

- [x] 2.1 Add cancellation state and controller-ownership guards in
      `src/hooks/useQuickResolve.ts`, preserving success and failure behavior.

## 3. Verify the contract

- [x] 3.1 Prove the cancellation and ownership mutants fail the regression tests.
- [x] 3.2 Run the full hook tree and integration directory, both TypeScript
      configurations, root lint, unit lint and its tests, formatter, OpenSpec
      validation, and the repository budget check; record results outside Git.
