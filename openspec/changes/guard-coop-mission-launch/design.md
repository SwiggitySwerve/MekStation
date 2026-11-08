# Co-op launch and retry

The co-op launch attempt owns exclusivity and progress. The page supplies transport and persistence operations; it renders progress instead of deciding transitions. An attempt is keyed by store identity and campaign/session/mission. The guard is acquired synchronously before preparation can yield. Different missions and single-player remain independent.

Preparation captures the accepted head, catalog, encounter and contributions. An uncertain remote create retries the same payload because the existing server fingerprint includes the accepted head. Once a shared receipt exists, retries do not create another shared match. Encounter configuration and launch retain the first local id. A successful local launch is held before checkpointing, so checkpoint or navigation failure cannot relaunch combat.

The host adds the actual id to the current mission using the existing scenario-list helper. Its store save already awaits authenticated durable persistence; an additional persistence save would duplicate the checkpoint. A conflict is surfaced with a resync-and-retry action. Resync adopts the server record, reapplies only the held mission linkage, and retries through ordinary compare-and-swap. No stale whole-envelope overwrite is allowed.

Guests do not enter creation or checkpointing. They refresh the server campaign before joining its recorded encounter, retaining deploy versus HQ routing. The surface explains that the host starts the mission.

K6's client and server readiness checks remain in use. S1a owns encounter-to-session linking and completion. This change does not edit either pre-battle hook or introduce another lifecycle table.

The attempt exists only in memory. A process crash before checkpoint can lose the pending linkage; no crash-safe recovery claim is made. Earlier orphan encounters are left untouched. See `src/lib/campaign/coop/RULES.md` for the operational limits.
