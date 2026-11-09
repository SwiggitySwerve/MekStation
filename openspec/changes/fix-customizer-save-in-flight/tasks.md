## 1. Regression proof

- [x] 1.1 Add deferred create/overwrite, cancellation, retry, and save-before-close tests in the existing dialog handler suite; record a red run.
- [x] 1.2 Extend existing SaveUnitDialog and MultiUnitTabs tests for saving state, disabled controls, real modal dismissal, and state propagation.

## 2. Implementation

- [x] 2.1 Add the synchronous in-flight ref and finally-cleared `isSaving` state to the dialog handler, guarding resubmission, cancellation, and save-dialog replacement.
- [x] 2.2 Forward state through the existing controller and tabs component; disable dialog actions and inputs and pass `preventClose`.

## 3. Verification

- [x] 3.1 Record green regression runs and failing mutants that remove the ref guard and `preventClose` independently.
- [x] 3.2 Run whole affected test directories, integration, both TypeScript configs, lint, unit lint and its suite, formatting, OpenSpec validation, and CI budgets.
