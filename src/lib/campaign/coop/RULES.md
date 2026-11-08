# Co-op mission launch

`coopMissionLaunchAttempt.ts` owns the browser attempt lifecycle. The server's match admission and journal remain authoritative.

- Only the host creates and checkpoints a mission. The guest keeps participation choices, reads the host's saved mission, and joins its linked encounter or returns to HQ. A scenario placeholder without a stored game-session link cannot be joined.
- The synchronous guard is scoped to store identity and campaign/session/mission. It is taken before preparation can yield. Different missions and single-player remain independent.
- Preparation captures the accepted head, catalog, encounter and selected contribution identities. An uncertain create response retries that request unchanged. A definitive refusal permits fresh preparation.
- Retain the shared match receipt, then the first local encounter id, then the successful launch receipt. Retrying configuration or launch reuses the encounter; retrying checkpoint or navigation does not relaunch combat.
- K6 owns readiness. Check deploying contributions with its selector; the server repeats admission after its asynchronous work. A day advance in flight refuses a new launch; the server's head check governs races from another client.
- Refresh the authoritative campaign before checkpointing. Install the mission and child-store projections together through the public campaign-store operation, then save once. The co-op store save already awaits the authenticated journal checkpoint.
- A checkpoint conflict is a resync-and-retry error. Adopt the server record, reapply only the held encounter linkage to the current mission, and use ordinary compare-and-swap. Never substitute a reported version onto a stale envelope or force-overwrite it.
- Await navigation. Failure or cancellation can retry navigation without another launch or checkpoint. A later opening can reuse a recorded encounter whose stored session link exists.
- K15 owns mission-to-encounter linkage in the existing `scenarioIds` list. S1a owns encounter-to-session linking and completion. Call its service boundary; do not duplicate its transition rules or edit the pre-battle hooks here.

## Recovery limits

The pending attempt is held only in process memory. A browser/process crash before the campaign checkpoint can lose its local encounter linkage, including an encounter that already launched. The shared match's durable idempotency receipt survives, but it does not contain the newly generated local encounter id. Recovery across that gap would require an additional durable mapping and is outside this change. A completed checkpoint preserves the existing encounter id for later openings.

Earlier double launches may have left extra Draft or Launched encounters. This change neither migrates nor deletes them, and a launched encounter must not be demoted or deleted merely to make a retry succeed. Inspect suspected rows and their session links read-only; any cleanup needs a separate reviewed change. No new schema, serialized field, replay pack or campaign-event payload is introduced.
