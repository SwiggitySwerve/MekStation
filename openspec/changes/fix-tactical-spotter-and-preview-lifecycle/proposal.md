## Why

The tactical shell's forward-only event cursor leaves spotter rings stale after undo or history replacement. The dock also abandons a pending GM preview when another starts or the dock unmounts.

## What Changes

- Derive elected spotter pairs from Selected/Lost events in the current turn of the current session, without retaining an event cursor or mirrored spotter state.
- Cancel the dock's pending preview before requesting its replacement and on unmount, using the cancel callback from the service that created it.
- Keep blocked approval pending, including the freshness refusals introduced by #3100. Successful approval and manual takeover release the preview without cancellation.

## Impact

Only the tactical shell, dock, their existing component suites, and this change package change. The GM pipeline, freshness validator, campaign control-plane reducer, engine, event payloads, persisted formats, and canonical history remain unchanged.

Related specifications: `openspec/specs/tactical-map-interface/spec.md` and `openspec/specs/gm-tactical-command-surface/spec.md`.
