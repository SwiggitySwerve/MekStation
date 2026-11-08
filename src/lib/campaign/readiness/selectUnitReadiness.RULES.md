# Campaign unit readiness

`selectUnitReadiness` owns campaign condition and deployment reasons. It is a
pure read: selecting readiness never changes a saved record, roster cache,
combat flag, ticket, or journal event.

## Sources and precedence

- Explicit journal authority uses journal unit status. Missing journal units
  cannot deploy. Local combat maps cannot revive a journal-destroyed unit.
- Snapshot authority uses current combat state and recorded maxima. No combat
  state on a never-deployed roster unit is not evidence of destruction.
- `deriveRosterReadiness` owns physical condition. It delegates the CT gate to
  `isUnitCombatReady`; a true flag cannot override destroyed CT structure.
- A stale false flag is reconciled only when current armor, structure, and ammo
  match every recorded maximum with identical key coverage, positive structure
  maxima, no destroyed components or locations, and no remaining heat. Missing
  or contradictory evidence does not establish recovery.
- An armor-only damaged cache is retained when no maxima can disprove it.
- Canonical repair queues precede projected bay caches. Repair activity uses
  `isActiveRepairTicket`; terminal tickets contribute nothing. In-progress and
  parts-needed work block; queued work warns, preserving K7's distinction.
- Pilot availability uses `isRosterPilotDeployable`, including K1's legacy
  departure markers. A required pilot must be assigned and present.
- In-progress refits block deployment. Proposed and terminal refit orders do
  not represent a unit currently undergoing refit. K8 owns their lifecycle.

Condition and deployment eligibility are separate: an undamaged unit with an
unavailable pilot can display Ready while its deployment reason blocks launch.
Catalog admission and mission-size limits belong to mission readiness.

## Authority transport and launch

The launch-head route resolves mode through `campaignAuthorityMode`. A journal
stream alone does not establish journal authority: shadowing remains snapshot.
The additive `readinessAuthority` response field is optional. Older successful
responses default to snapshot without inventing journal status. Malformed
authority is refused; transport failures remain unavailable.

Campaign UI subscribes to current roster and campaign facts. The shared
`useReadinessAuthority` hook drops obsolete responses on replacement/unmount.
Launch adapters pass current readiness facts to materialization; co-op checks
actual deploying contributions and excludes HQ-only contributions. Owned-force
materialization still resolves authority and ownership through its existing
contract; the encounter materializer checks every unit it actually fields.
Server co-op admission independently reads saved campaign and journal facts,
before match creation, and accepts no client readiness assertion.

The materializer retains its older structural-only call seam for callers that
omit readiness context; all production campaign adapters supply that context.
Standalone force setup, generic encounters without roster-instance linkage,
and combat execution retain their separate contracts.

## Pinned upstream rule

MekHQ `e7adc2c6f3b17ec8ad243d30843e22207fe935e4`,
`MekHQ/src/mekhq/campaign/unit/Unit.java`:

- `checkDeployment`, lines 1660–1691: functional unit, required crew, no active
  refit; vehicle and BattleArmor crew checks are specific to those unit types.
- `isFunctional`, lines 1012–1066: actual entity damage determines function.
- `isRepairable`, lines 1073–1100: repairability differs from functionality.
- `isAvailable`, lines 379–380: transit, deployment, refit, and mothball state
  separately govern availability for campaign actions.

MekStation does not currently represent every upstream crew or critical-hit
fact. This selector composes represented facts and does not fabricate them.
Persisted schemas and combat event payloads are unchanged.
