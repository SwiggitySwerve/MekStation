## Overview

Use the existing campaign authority signal instead of introducing a new auth system. A campaign without `coopSession` is a local owner-controlled campaign. A co-op campaign with `coopSession.mode === 'host'` is also GM-owned locally. A co-op campaign with `coopSession.mode === 'guest'` is a player mirror with no campaign-write authority.

## Decisions

- Add a small campaign authority helper that resolves GM/player capabilities from `campaign.coopSession`.
- Gate the `GM Ledger` campaign command tab with that helper.
- Keep direct route recovery safe: an unauthorized guest who enters `/gameplay/campaigns/[id]/gm-ledger` sees the player action log projection only, not preview/approval controls or GM-private metadata.
- Preserve all existing owner/host GM ledger tests and browser flows.
- Update stale boundary documentation to match the current implemented economy and time-cascade slices.

## Validation

- Component tests for command navigation visibility.
- Component tests for guest/player ledger projection redaction.
- Browser test for a guest mirror direct route: no GM controls, no private log, player-safe public history only.
- Focused GM ledger validator and existing GM browser proof continue passing.

## Risks

- This does not prove account-level ownership. It only hardens the current authority model encoded in campaign session state.
- Some older campaign pages instantiate `CampaignNavigation` directly; those call sites need the same authority behavior through the shared component default.
