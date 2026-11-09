# Clean up failed co-op campaign creation

## Why

Co-op entry creates and saves a campaign before requesting a room. A refused room request leaves that saved campaign behind, and retries create further orphan campaigns.

## What Changes

- Track the campaign created by this attempt and its save acknowledgement.
- Delete only the campaign id returned by that save, after checking it matches this attempt and differs from the pre-existing campaign.
- Restore prior local campaign and persistence snapshots only while this attempt's campaign remains selected.
- Surface cleanup failures and offer cleanup retry before permitting another creation.
- Preserve an acknowledged room on later setup/navigation failure and offer its campaign instead of creating another room.

## Impact

- Affected spec: `coop-campaign-sync`.
- Affected code: `CampaignCoopEntryPanel` and its existing component tests.
- Uses existing campaign deletion and persistence contracts. No protocol, persisted-format, mission-launch, participation, or force-materialization changes.
- A failed save has no acknowledged id eligible for deletion; local state is restored without guessing a server record id.
