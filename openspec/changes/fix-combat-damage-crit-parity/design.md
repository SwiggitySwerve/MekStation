# Design: Restore MegaMek Parity in Damage and Critical-Hit Resolution

## Context

Combat damage and crit resolution live in three parallel implementations (the interactive
`gameSessionAttackResolution` path, the pure `utils/gameplay/damage` + `criticalHitResolution`
helpers shared by it, and the `simulation/runner` phases). The 2026-06-12 review found the same
class of parity defect — a value the code applies that the spec claims, but MegaMek does not —
recurring across these surfaces. Because the helpers are pure and the head cap / crit-slot /
CASE / ammo-explosion logic is centralized in named functions, each fix is bounded and
test-anchorable against the MegaMek Java oracle.

This change is remediation only: it specifies the corrected behavior and the red-first tests
that pin it to the MegaMek source, and re-tightens the four owning capability specs. It does
**not** introduce a new resolution layer — the existing three implementations stay, and the
fixes are applied at the named sites so they converge on identical behavior.

## Decisions

### D1 — Head damage: remove the cap entirely; full damage to armor then internal structure

The 3-point cap is removed at all four sites. On a head hit, the normal
armor → internal-structure → destruction cascade runs with the *full* incoming damage. The
head still has only 3 points of internal structure, so a sufficiently large hit that penetrates
armor will destroy the head (and the unit) — which is exactly the MegaMek behavior and restores
the possibility of cockpit/head kills.

- **Preserve:** the single pilot wound applied on a head hit (`resolve.ts` `applyHeadPilotDamage`,
  the `Pilot Damage from Head Hits` requirement) and the roll-of-12 head-destruction crit path
  (`critical-hit-resolution` "Roll of 12 on the head").
- **Retire** the `HEAD_DAMAGE_CAP_PER_HIT` constant and `HEAD_HIT_DAMAGE_CAP`
  (`SimulationRunnerConstants.ts:14`), and the misleading "Total Warfare p.41" comment block at
  `resolve.ts:27-34`.
- **Rationale:** MegaMek `TWDamageManager` applies full head damage and exactly one crew wound;
  `3` is the head IS value, not a damage cap. Capping is a fabricated rule.

### D2 — Crit-slot selection: uniform random over all slots with rejection

Replace `(roll - 1) % availableSlots.length` (a single d6 modulo) with a uniform draw over the
*full* slot list of the location, rejecting already-destroyed/empty slots and re-drawing until a
valid slot is found (bounded retry; fall through to "no additional effect" if every slot is
already destroyed, preserving the existing `Critical Slot Selection` exhaustion scenario).

- The draw MUST use the injected `D6Roller`/`DiceRoller` so determinism is preserved
  (`critical-hit-resolution` "Injectable Randomness for Critical Hits").
- **Rationale:** MegaMek `TWGameManager.java:21731` rolls a uniform index across all slots and
  rejects hit slots. The modulo approach mathematically excludes indices ≥ 6 in any 12-slot
  location with more than 6 live slots, so last-placed equipment (ammo, heat sinks) is
  unhittable — a silent, systematic parity gap.

### D3 — Standard CASE: vent all excess, no 10-point cap

`resolveCaseAdjustedAmmoExplosionDamage` for `caseProtection === 'standard'` caps damage applied
to the location at `min(totalDamage, internalStructureRemaining)` — i.e. the location absorbs up
to all of its remaining internal structure and the rest is *vented* (no transfer to the parent
location). The `STANDARD_CASE_DAMAGE_CAP` 10-point cap is removed. CASE II's behavior (cap to 1
point, no destruction unless concurrent damage destroys the location) is unchanged.

- **Rationale:** MegaMek `TWDamageManager.java:1689` directs all standard-CASE explosion damage
  beyond the consumed internal structure to the environment. The 10-point cap under-destroys a
  healthy CASE'd side torso (it survives a cook-off it should not). "Vent the excess" still means
  *no transfer to CT* — the difference is the local location takes its full IS worth of damage,
  not an arbitrary 10.

### D4 — Vehicle engine crit: immobilize, do not auto-destroy

`applyEngineHit` stops setting `destroyed: true` on the second hit. An engine hit sets/keeps the
vehicle immobilized (`motive.immobilized = true`, cruise/flank MP → 0) and increments the engine
hit counter. Deterministic destruction is removed (MegaMek's destruction is the optional
fusion-explosion rule, which this change does not implement — it is enumerated as out of scope so
the spec is honest that immobilize is the only deterministic outcome).

- **Rationale:** MegaMek `Tank.java:2180` `engineHit()` immobilizes; it does not destroy.

### D5 — Resolver ammo-explosion crit routes through the explosion module

`applyAmmoHit` (`equipmentEffects.ts:70`) is rewired so that, when the critted slot is a loaded
ammo bin, it invokes the ammo-explosion module (`resolveAmmoExplosion` /
`resolveCaseAdjustedAmmoExplosionDamage`) to produce internal-structure damage, CASE/CASE-II
handling, transfer/vent per D3, and pilot damage per D7 — and emits the `AmmoExplosion` event
already specified by `ammo-explosion-system`. An empty bin still just marks the slot destroyed
with no explosion (existing "Empty ammo bin critical hit" scenario).

- This is the resolver-side counterpart to the already-specced
  `Ammo Explosion Triggered by Critical Hit on Loaded Bin` requirement; the gap is that the
  *resolver* path drops it while the runner path honors it.

### D6 — Apply TAC in the simulation runner

The simulation runner's weapon-attack hit resolution
(`weaponAttackHitResolution.ts:372`, around the head-cap removal site) gains the roll-of-2 TAC
branch the interactive engine already has: a hit-location roll of 2 routes to the
attack-direction TAC location (front/rear → CT, left → LT, right → RT) and performs a critical
hit determination roll regardless of remaining armor, applying any resulting crits through the
shared critical-hit-resolution system.

- **Rationale:** `damage-system` "Through Armor Critical (TAC)" already mandates this; the sim
  runner is the only path that omits it, causing interactive↔sim divergence on every roll-of-2.

### D7 — Non-CASE explosion pilot damage = 2

`UNPROTECTED_EXPLOSION_PILOT_DAMAGE` (`explosions.ts:25`) changes from 1 to 2, and the
`ammo-explosion-system` "No CASE Explosion Damage" requirement's scenario is corrected to 2
wounds. CASE / CASE II continue to inflict 0 pilot damage.

### D8 — Crew-crit single source (driver/commander)

The driver/commander 2-hit-kill helpers (`applyDriverHit`, `applyCommanderHit`) are aligned with
the faithful crew-crit escalation the production vehicle-crit *table* layer already applies, so
there is a single source of truth for crew-crit effects. Because this branch is contested
(reachable only via the BA leg-attack helper), the fix is to delegate the helper to the table
layer rather than rewrite the table layer — minimizing behavioral risk on the dominant path.

## Open Questions

(none)

## Risks

- **Head-cap removal makes head/cockpit kills possible for the first time** — scenario fixtures
  and any balance tests that implicitly assumed heads were un-killable may shift outcomes. The
  red-first tests (group 1) characterize current behavior before the change so the delta is
  visible; balance-sensitive suites are re-run in the verification group.
- **Crit-slot uniform draw changes the distribution of which components get critted** — any
  statistical combat proof keyed to the old (biased) distribution may move. The agreement is to
  the MegaMek distribution; if a proof breaks, the proof was encoding the bug.
- **CASE vent-all-excess increases damage to CASE'd side torsos** — destruction of CASE'd
  locations becomes possible where the 10-cap previously saved them; this is the intended
  correction and is covered by updated CASE scenarios.
- **Resolver ammo-explosion now applies real damage on a path that previously no-op'd** — units
  that survived a resolver-path ammo crit will now take the explosion; correct, but a behavior
  change on the live `resolveAttack` path that must be regression-tested against the runner path
  for parity.
- **Three implementations must converge** — the head-cap, TAC, and ammo-explosion fixes touch
  both the shared helpers and the sim runner; the verification group asserts interactive and sim
  paths now agree, to prevent fixing one and leaving the other.
