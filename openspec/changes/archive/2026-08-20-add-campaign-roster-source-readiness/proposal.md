## Why

Campaign launch currently lacks one fail-closed contract for roster source identity and canonical catalog readiness. Before saved custom designs can join a campaign roster, the canonical-only encounter boundary must distinguish legacy canonical entries from explicit custom or invalid sources and block unsupported inputs without side effects.

## What Changes

- Add a persisted roster-source parser whose only legacy default is an absent source, normalized to `canonical`; present unknown values remain invalid.
- Add an explicit runtime catalog snapshot with `loading`, `ready`, and `unavailable` states for browser and Node campaign paths.
- Require one exact-reference guard before readiness diagnostics, encounter lookup/reuse, route calls, or mutation.
- Prove invalid, custom, forged, stale, loading, unavailable, and downgrade inputs remain visible and non-launchable without side effects.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mission-contracts`: Make roster source identity and canonical catalog readiness explicit prerequisites of encounter materialization.

## Non-goals

- Making saved custom units combat-playable or adapting them into canonical encounters.
- Adding the saved-design picker, campaign persistence commit, co-op participation, or Mech Bay resolution.
- Changing canonical unit data, combat rules, routes, or dependencies.

## Impact

- Affected contracts: persisted roster source parsing, mission readiness projection, canonical unit loading, and encounter materialization.
- Affected verification: `RosterUnitSource`, `missionReadinessProjection`, and `materializeCampaignMissionEncounter` focused Jest suites.
- Delivery remains one later product PR capped at 10 files and 400 changed lines; this specification PR changes no runtime behavior.
