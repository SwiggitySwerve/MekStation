## Why

Server-loaded campaigns carry applied battle IDs on the campaign, while enqueue
and day advancement use separate store ledgers. Loading can erase the applied
IDs, allowing a republished outcome to credit its effects twice. Switching
campaigns also leaves the previous campaign's queue and errors active.

## What Changes

- Normalize campaign and store battle state at hydration and campaign changes.
- Share the applied-outcome guard between enqueue, retry, and review.
- Deduplicate salvage using the existing persisted allocation flag.
- Surface per-unit application errors without repeating committed effects.

## Impact

Campaign store, post-battle and salvage processors, and minimal review-page
wiring. Existing serialized fields and event payloads are preserved. No schema
version, replay-pack, contract-resolution, save-lifecycle, or daily-cost changes.
