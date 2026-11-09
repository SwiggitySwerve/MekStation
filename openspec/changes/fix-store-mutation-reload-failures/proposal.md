## Why

Encounter and pilot store mutations report success even when their subsequent list reload fails. Creation can select an unavailable pilot or invite duplicate creation. The existing public loaders deliberately store errors instead of rejecting.

## What Changes

- Check the reload outcome before returning mutation success in the encounter and pilot stores.
- Return the existing failure value when refresh fails, while explicitly saying the server saved the change and instructing the user to reload.
- Select newly created pilots only after a successful reload.
- Cover every affected store action with success, reload-failure, and mutation-rejection tests.

## Impact

- Affected specs: [encounter-system](../../specs/encounter-system/spec.md), [pilot-system](../../specs/pilot-system/spec.md).
- Integration points: existing store actions used by encounter configuration, pilot management, campaign creation, and awards persistence.
- Public action signatures, loader behavior, schemas, persistence, server authority, and gameplay rules stay unchanged.
- Tech base and temporal availability are unaffected.

## Non-goals

Pilot wizard result handling (U7), pre-battle launch feedback (U13), other UI workflows, retries, concurrent-load coordination, engine changes, and rollback of completed server mutations.
