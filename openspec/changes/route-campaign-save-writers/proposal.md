## Why

The internal campaign save lifecycle now uses one reducer (#3170), but creation,
day rollback, and co-op creation cleanup still write persistence fields through
Zustand setState. Route those three production callers through named actions
without changing their guards, effects, notifications, or update ordering.

## What Changes

- Add reducer events and actions for created-campaign identity, rollback dirty
  restoration, and failed-creation snapshot restoration.
- Replace only the three external partial updates with those actions.
- Characterize ordering before implementation and test the new action boundary.
- Preserve #3144's co-op preset hint and K-L7 cleanup and retry behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-persistence`: require external production writes to use the reducer.

## Impact

Campaign store creation, the day rollback tail, and the co-op entry cleanup.
No schema, network, replay, fixture, readiness, or launch UI changes. Launch
recovery and save scheduling remain held for PR3 and D-11. The creation hunk
stays separate from K2's mission collection and save merge work.
