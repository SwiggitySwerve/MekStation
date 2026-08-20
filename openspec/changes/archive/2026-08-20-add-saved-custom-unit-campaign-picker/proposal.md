## Why

Campaign creation currently offers only representative stock templates. CAMP-01E adds saved BattleMechs without collapsing the saved-design id into the campaign roster-instance id or trusting malformed custom-unit index metadata.

## What Changes

- Runtime-validate saved BattleMech index entries before they become picker options.
- Present Stock Templates and Saved Designs as separate named groups with honest loading, empty, failure, and retry states.
- Mint a fresh roster-instance id for each selection while preserving the exact saved-design id as `unitRef` and `custom` as `unitSource`.
- Prove keyboard, feedback, desktop, and 390x844 behavior through the production roster step.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-ui`: Add a source-aware saved-design picker that preserves separate design and roster identities.

## Non-goals

- Persisting the completed campaign to the server, resolving saved metadata in Mech Bay, or adapting custom units for combat.
- Copying custom-unit construction payloads into campaign state.

## Impact

- Affected contracts: campaign creation adapter, roster step, roster projection, root-force membership, and the campaign-customizer handoff journey.
- Delivery remains one later product PR capped at 10 files and 450 changed lines; this specification PR changes no runtime behavior.
