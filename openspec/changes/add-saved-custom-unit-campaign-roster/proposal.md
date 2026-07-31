## Why

The campaign creation roster exposes only four representative stock BattleMechs. A player can customize and save a canonical unit, prove that the custom-unit API assigned a durable `custom-*` identity, and still cannot select that saved design for a campaign. This blocks the required customizer-to-campaign authority journey and forces campaign creation to discard the design the player just saved.

## What Changes

- Load saved custom BattleMech metadata through the existing custom-unit API and show it in a distinct, named Saved Designs group beside the four representative stock templates.
- Preserve the saved design's API id as the campaign roster entry's `unitRef`, persist an explicit custom source discriminator, and mint a separate roster-instance `unitId`; add the roster instance to the root force without copying construction data into campaign persistence.
- Resolve custom-unit metadata on campaign surfaces that currently consult only the canonical index, so a reloaded Mech Bay can identify the saved design and show available tonnage/BV metadata without a stock fallback.
- Commit wizard-created campaign and roster state through the production server-persistence path before success navigation, with an honest same-campaign retry when the server commit fails.
- Keep saved custom units visible and recoverable in mixed-roster mission readiness while an authoritative pre-materialization guard blocks custom combat with a per-unit canonical-combat-unavailable reason.
- Add a browser trust anchor that proves the same custom id through save, campaign creation, server-backed campaign/force persistence, cold reload, Mech Bay, and the blocked mission-readiness boundary, then launches canonical units from the same mixed roster into playable combat and proves authoritative session/post-battle persistence after navigation and cold reload.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `desktop-experience`: Require the packaged local server's actual listener to bind the configured loopback hostname before CAMP-01 exposes persisted campaign/custom-unit routes.
- `campaign-ui`: Let the campaign roster step add saved custom BattleMechs with distinct source and roster-instance identities, explicit loading/recovery UI, and durable reload behavior.
- `campaign-bay-ui`: Resolve Mech Bay metadata from canonical or saved-custom sources while preserving the roster's stable `unitRef`.
- `campaign-persistence`: Require the production campaign-creation submit path to receive an accepted server commit before reporting success.
- `mission-contracts`: Preserve saved-custom roster identity at mission readiness while preventing an unresolved custom source ref from crossing the canonical-only launch boundary.
- `journey-qc`: Add an authority-backed custom-unit campaign/combat handoff journey with desktop and narrow-screen accessibility, cognitive-load, playability, enjoyment, visual, server, store, persistence, navigation, and reload evidence.

## Non-goals

- Adapting a custom unit into a playable combat session or changing the canonical-only encounter materialization contract.
- Reworking campaign pre-battle setup, interrupted-game recovery, or post-battle processing; CAMP-01H still verifies the existing production launch/session/return/persistence path without changing those behaviors.
- Changing server-side custom-unit serialization/creation validation, version history, or save eligibility; this wave validates index metadata only at the campaign adapter boundary.
- Adding tenant authentication/ownership middleware to the local-first campaign/custom-unit APIs; the base `api-layer` specification tracks authentication middleware as a future enhancement. Remote/shared deployment of those routes remains blocked on that separate security capability.
- Adding event-journal runtime behavior, maintenance cleanup, or PROOF-02 harness repairs; the development MIME diagnostic, guest-badge timing, and save-conflict timing require separately specified and independently verified PRs if fresh reproduction confirms distinct causes.

## Impact

- Affected UI: campaign creation roster step, Mech Bay metadata resolution, mission-readiness blocking/recovery feedback, and journey evidence around existing combat command and post-battle surfaces.
- Affected state: campaign-wizard draft selection, roster projection mapping/provenance, root-force membership, explicit server commit, and readiness/materialization preflight.
- Affected verification: strict shared CAMP-01 receipt validation, focused component/state tests, packaged-socket proof, `e2e/coop-campaign-two-browser-journey.spec.ts`, `e2e/campaign-customizer-handoff.spec.ts`, `e2e/campaign-long-browser-signoff.spec.ts`, and `e2e/ux-deep-play-audit.spec.ts`.
- No campaign construction-payload schema, combat engine, or dependency change is intended; co-op participation narrows to verified minimal force choice, while CAMP-01H proves the existing canonical combat route rather than adapting the saved custom unit for combat.
- This is a specification-only parent that preserves the audit's CAMP-01 outcome while superseding its older one-PR delivery shape with the user's later explicit one-wave/one-PR/OpenSpec contract. Before product implementation, separately author, review, and merge child changes `add-camp01-authority-receipts`, `bind-packaged-server-to-loopback`, `add-campaign-roster-source-readiness`, `add-authoritative-campaign-coop-snapshot`, `authorize-campaign-coop-participation`, `enforce-campaign-unit-source-launch-boundary`, `add-saved-custom-unit-campaign-picker`, `persist-saved-custom-unit-campaign-creation`, `resolve-saved-custom-units-in-mech-bay`, and `prove-saved-custom-unit-campaign-journey`; each stays below 15 files/500 lines, passes its exact `WAVE_CONTRACTS` gate, and merges before its implementation/follower. Fresh exact-main PROOF-02 results require one separately reviewed child spec and focused repair PR for every still-failing distinct in-scope Critical/Major cause without an external blocker; already-passing historical anchors require no repair, while unexpected failures or coverage gaps require explicit independent triage to repair, documented external blocker, or lower-severity audit backlog before CAMP-00. CAMP-01H additionally waits for every observed finding's disposition, all required merged repairs, and an exact-main `qc:command:browser:quick` result with zero failures across the complete observed aggregate.
