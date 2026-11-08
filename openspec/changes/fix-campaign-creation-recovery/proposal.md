## Why

The campaign wizard treats a campaign as ready to retry before pilot registration
and roster population finish. A failed registration can therefore be followed by
a successful save of an empty roster. Creating after viewing another campaign
also reuses that campaign's persistence identity and version.

## What Changes

- Mark the pending wizard campaign reusable only after population completes.
- Refuse create and guest-mirror replacement while existing persistence has
  unacknowledged edits, a save, a pending flush, or a reconciliation/load read.
- Reset clean persistence and bind it to the new campaign before publishing it.
- Preserve completed-roster retries, legacy adoption, K3 battle-ledger hydration,
  K4 edit-sequence tracking and K1 roster normalization.

## Impact

Wizard submission and campaign creation actions, with a read-only persistence
selector. Existing callers display the thrown refusal through their error paths.
No save-coordinator semantics, new wiring, serialized formats, event payloads,
replay packs, or schema versions change.

Follow-up: awaited save-before-switch for switchCampaign/create. Pilot-vault
compensation, wizard step validation, and conflict-message changes are outside
this fix.
