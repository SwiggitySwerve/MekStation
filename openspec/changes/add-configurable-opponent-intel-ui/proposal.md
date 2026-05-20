## Why

BattleTech play can range from open-information skirmish to GM-mediated fog and sensor uncertainty. The tactical UI needs configurable opponent state visibility so exact, rough, last-known, and hidden information are consistently projected in map tokens, inspectors, event feed, and replay.

## What Changes

- Add match/GM-controlled opponent intel presets.
- Define exact, rough, last-known, hidden, and unknown state projections.
- Extend fog/redaction UI so unit panels, target previews, event log, and replay use the same visibility contract.
- Keep redaction in data adapters, not just CSS hiding.

## Capabilities

### New Capabilities

- `opponent-intel-ui`: UI and projection contract for configurable enemy information visibility.

### Modified Capabilities

- `fog-of-war`: Adds GM-configurable intel tiers and combat-state projection rules.
- `tactical-map-interface`: Displays intel confidence and redacted opponent state consistently.

## Impact

- Affected UI: enemy tokens, target inspector, force comparison, event log, replay, GM/referee settings.
- Affected state: match intel policy, per-unit visibility tier, stale/last-known timestamps, confidence bands.
- Security/privacy: hidden state must be stripped before it reaches non-GM UI projections.
