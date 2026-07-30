## Why

The campaign creation roster exposes only four representative stock BattleMechs. A player can customize and save a canonical unit, prove that the custom-unit API assigned a durable `custom-*` identity, and still cannot select that saved design for a campaign. This blocks the required customizer-to-campaign authority journey and forces campaign creation to discard the design the player just saved.

## What Changes

- Load saved custom BattleMech metadata through the existing custom-unit API and show it in a distinct, named Saved Designs group beside the four representative stock templates.
- Preserve the saved design's API id as the campaign roster entry's `unitRef` while minting a separate roster-instance `unitId`; add the roster instance to the root force without copying construction data into campaign persistence.
- Resolve custom-unit metadata on campaign surfaces that currently consult only the canonical index, so a reloaded Mech Bay can identify the saved design and show available tonnage/BV metadata without a stock fallback.
- Add a browser trust anchor that proves the same custom id through save, campaign creation, server-backed campaign/force persistence, cold reload, Mech Bay, and mission readiness.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `campaign-ui`: Let the campaign roster step add saved custom BattleMechs with distinct source and roster-instance identities, explicit loading/recovery UI, and durable reload behavior.
- `campaign-bay-ui`: Resolve Mech Bay metadata from canonical or saved-custom sources while preserving the roster's stable `unitRef`.
- `journey-qc`: Add an authority-backed custom-unit campaign handoff journey with desktop and narrow-screen accessibility/visual evidence.

## Non-goals

- Adapting a custom unit into a playable combat session or changing the canonical-only encounter materialization contract.
- Reworking campaign pre-battle setup, interrupted-game recovery, or post-battle processing.
- Changing custom-unit serialization, validation, version history, or save eligibility.
- Adding event-journal runtime behavior, maintenance cleanup, or a new dependency.

## Impact

- Affected UI: campaign creation roster step and Mech Bay metadata resolution.
- Affected state: campaign-wizard draft selection, roster projection mapping, and root-force membership.
- Affected verification: focused component/state tests plus `e2e/campaign-customizer-handoff.spec.ts`.
- No campaign construction-payload schema, combat engine, multiplayer protocol, or dependency change is intended.
