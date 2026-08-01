## Why

Campaign co-op currently mirrors ledger state without a revision-bound roster and force-membership projection. CAMP-01 participation cannot be authorized until host, registry, and guest agree on the same campaign, match, revision, unit source identities, and force membership.

## What Changes

- Extend the authoritative campaign snapshot with source-bearing roster records and an explicit `forceId -> unitIds` projection.
- Build the snapshot from the host's persisted campaign roster and force tree at co-op entry, then preserve it through match registration and `CampaignHostRegistry` hydration.
- Require guest bootstrap and replay to hydrate the same immutable projection at the advertised revision.
- Reject malformed, stale, foreign-campaign, wrong-match, or internally inconsistent snapshots instead of synthesizing membership or source identity.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `multiplayer-sync`: Bind campaign co-op bootstrap and guest mirroring to a validated campaign roster/force snapshot owned by the authoritative server.

## Non-goals

- Authorizing which player may select a force or launch a mission; CAMP-01C and CAMP-01D own those seams.
- Adding saved-design selection, persistence, custom-unit combat adaptation, or new transport dependencies.
- Replacing the existing campaign event/replay model or broadening peer-to-peer authority.

## Impact

- Affected contracts: `CampaignSync`, campaign co-op entry, match registration, `CampaignHostRegistry`, and guest shared-state hydration.
- Affected verification: four focused Jest suites plus `verify:qc:coop-campaign-journey`.
- Delivery remains one later product PR capped at 14 files and 480 changed lines; this specification PR changes no runtime behavior.
