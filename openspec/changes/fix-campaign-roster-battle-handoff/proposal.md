## Why

A campaign's fighting force never actually fights. The 2026-07-07 live playtest (`.sisyphus/evidence/playtest/2026-07-07-live-playtest/REVIEW.md`, findings C4 + M1) showed the Mission Launch screen's 4-unit, 4-pilot selection materializes into a 1v1 between two hardcoded units: `materializeCampaignMissionEncounter` picks a single roster unit and keyword-maps it onto `atlas-as7-d` (else `marauder-mad-3r`), the OpFor is always one hardcoded Marauder, and pilot assignments are dropped entirely. Upstream, the wizard's roster units are non-catalog weight-class placeholders ("not cataloged", 0 BV) and its pilots are four identical "MechWarrior 1" entries that are not registered in the pilot vault ("Pilot not found in vault"), so there is nothing real to materialize even if the selection were honored.

## What Changes

- Campaign creation wizard roster units become canonical-backed: each roster template selection stores a real canonical `unitRef` (representative unit per weight class, user-overridable later), so campaign units have real weight/BV/loadout everywhere (Mech Bay, encounter forces, BV math).
- Wizard-created pilots get distinct default names (MechWarrior 1..N) and are registered in the pilot vault so Personnel progression/abilities/assignment panels resolve them.
- Mission-launch materialization carries the FULL selected roster into the player force: one force assignment per selected unit with its canonical `unitRef` and its assigned pilot. The keyword/`CANONICAL_UNIT_REFS` fallback mapping is removed; a roster unit that cannot resolve to a canonical ref blocks launch with a visible readiness reason (no silent substitution). **BREAKING** for the demo-era behavior of always producing an Atlas-vs-Marauder 1v1.
- OpFor generation scales to the player force: the opponent force contains as many units as the player deployed (canonical refs; BV-aware selection where the force-generator service is available, deterministic canonical picks otherwise) instead of one hardcoded Marauder.
- Pre-battle and in-battle surfaces consequently show real unit names, per-unit slots, non-zero BV, and assigned pilots (no "Slot 1", no "Unknown Pilot" for assigned crews).

## Capabilities

### New Capabilities

_None — all changes modify existing spec'd behavior._

### Modified Capabilities

- `campaign-ui`: "Campaign Creation Wizard" — the roster step SHALL produce canonical-backed units and vault-registered, distinctly-named pilots.
- `campaign-combat-loop`: "Campaign-Linked Encounter Launch" — the launched encounter SHALL contain every selected roster unit with its pilot assignment on the player force, and an opponent force sized to match; unresolvable roster units SHALL block launch with a reason.

## Impact

- **Materializer**: `src/lib/campaign/encounter/materializeCampaignMissionEncounter.ts` (remove `selectPlayerUnitRef`/`DEFAULT_*` fallback; multi-assignment force creation; pilot payloads), `missionLaunchCommandDiagnostics.ts` (diagnostics already log the full selection — keep parity with what is now actually used).
- **Wizard/store**: campaign creation wizard roster step (`src/components/campaign/wizard/` roster + pilot substeps), campaign store creation path (roster unit gets `unitRef`; pilots get vault registration + name suffixing), `IRosterUnitProjection` (carries `unitRef` + pilot linkage).
- **Force/encounter APIs**: `/api/forces` assignment flow already supports multi-slot lances (`createAssignedForce` currently uses only `assignments[0]`); encounter launch snapshot consumes multi-unit forces (verify `game-session-management` launch path handles N units — playtest quick-game already does 4v4).
- **Pilot vault**: registration call for wizard pilots (`/api/vault`-adjacent pilot persistence used by Personnel detail panel).
- **Tests**: materializer unit tests (multi-unit, pilot carry, block-on-unresolvable), wizard roster tests, one integration test launching a 4-unit mission into a session with 4 player units.
- **Non-goals**: full canonical unit picker UI in the wizard (representative mapping now; picker is a follow-up); OpFor difficulty tuning/scenario variety (force-generator integration beyond count/BV floor); fixing C1/C2 phase progression (separate change `fix-battle-phase-progression`, already in flight); salvage/payout economy effects.
