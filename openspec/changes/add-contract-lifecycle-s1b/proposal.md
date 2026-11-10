## Why

S1 can validate a staged (version 2) contract, but no processor honours one
yet. Anything that reads or writes a campaign body would terminalize and pay a
version 2 contract the legacy way. Root approved the S1b reader floor (wire
shapes included) on 2026-11-10; the writer stays dark (1) and nothing here
stamps version 2.

## What Changes

- A reader capability level, `LIFECYCLE_RULES_READER_MAX = 1`, separate from the
  writer and from the validator's maximum, plus the `X-MekStation-Lifecycle-Rules`
  request header (absent, malformed or repeated means 1, never a 400).
- A reader gate on GET and PUT `/api/campaigns/[id]`, adopt, redeem and
  commands: auth first, then the gate before any 409. A too-old reader gets 426
  `CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED` with an `Upgrade` header; an unreadable
  version is read-only with a named diagnostic and refused writes (422), not a
  426 for every reader.
- `Vary: X-MekStation-Lifecycle-Rules` on campaign GETs so the service worker
  cannot hand a version 2 body to a reader that did not ask for it.
- Client: the header on every gated request, a typed refusal for 426/422, and a
  Reload action where retrying cannot succeed.
- A local-storage seam: a campaign holding a contract above the reader level is
  written to `<key>.lifecycle` with a tombstone under the key older code reads;
  orphans are kept; a write by an outdated tab is overruled and the user told.
- One inert predicate (`isContractInert`) every contract reader asks, and a
  read-only display for an inert contract.
- Starting a co-op session on a campaign holding version 2 is refused until S6.
- Desktop: restore refuses a backup made by a newer app, startup refuses a
  database newer than the app, and the S7 marker migration is designed and
  stubbed, not activated.

## Impact

- Affected specs: `mission-contracts` (additive delta only).
- New persisted shapes: only the `.lifecycle` key, its tombstone and release
  marker, and the (inactive) desktop marker design.
- No producer stamps version 2; no digest, golden, fixture, pack or campaign
  schema version changes.
