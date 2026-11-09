## Why

The customizer permits duplicate create or overwrite requests while a library save is pending. Cancelling that dialog also leaves the pending request's close-after-save intent active.

## What Changes

- Own one in-flight save lock in `useDialogHandlers`, with synchronous duplicate and cancellation guards and visible `isSaving` state.
- Pass pending state through `useMultiUnitTabsController` and `MultiUnitTabs` to `SaveUnitDialog`; disable saving, renaming, and dismissal until completion.
- Retain existing failure, retry, concurrent-edit, library-receipt, and save-before-close behavior.

## Non-goals

Construction rules, BV, catalogs, unit stores, persisted fingerprints, and gameplay are unchanged. This adds no persistent fields or API changes.

## Impact

Extends [customizer-edit-recovery](../../specs/customizer-edit-recovery/spec.md). Integrates with the existing `DialogTemplate.preventClose` contract. Deferred API tests and real modal dismissal tests cover the request boundary and UI. The lock must clear after every terminal result so a failed save remains retryable.
