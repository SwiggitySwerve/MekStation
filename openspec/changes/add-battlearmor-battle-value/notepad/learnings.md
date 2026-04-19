# Learnings — add-battlearmor-battle-value

## Conventions (inherited from Wave 1)

- Per-type BV calculator lives in `src/utils/construction/<type>/<type>BV.ts` and is a pure function free of store/React deps.
- Adapter sits in `src/utils/construction/<type>/<type>BVAdapter.ts` and converts store state into BV input.
- Main dispatcher `battleValueCalculations.ts` re-exports the per-type calculator + types.
- Pilot skill multiplier table — reuse `getPilotSkillModifier(gunnery, piloting)` from `src/types/validation/BattleValue.ts`.
- Parity harness: `scripts/validate-<type>-bv.ts`, report written to `validation-output/<type>-bv-validation-report.json`.
- Tests live under `src/utils/construction/<type>/__tests__/<type>BV.test.ts`.

## BA-specific inputs (from Phase 6 construction)

- BA interfaces: `src/types/unit/BattleArmorInterfaces.ts` (IBattleArmorUnit, BAArmorType, BAManipulator, BAWeightClass).
- Construction utilities: `src/utils/construction/battlearmor/`.
- Store: `src/stores/useBattleArmorStore.ts`.
- Customizer: `src/components/customizer/battlearmor/`.
- Armor types: `BAArmorType` enum — Standard BA, Stealth (Basic/Improved/Prototype), Mimetic, Reactive, Reflective, Fire-Resistant.
- Manipulators: `BAManipulator` enum — Vibro Claw, Heavy Claw, Battle Claw, Basic Claw, etc.
- Weight classes: PA(L), Light, Medium, Heavy, Assault (string-valued enum).
- Squad sizes: 1–6; IS default 4, Clan default 5.

## Formula (from proposal + spec delta)

- Per-trooper defensive: `armorPoints × 2.5 × armorTypeMult + groundMP × classMult + jumpMP × 0.5 + antiMechBonus`.
- Armor multipliers: Standard 1.0, Stealth (all variants) 1.5, Mimetic 1.5, Reactive 1.3, Reflective 1.3, Fire-Resistant 1.1.
- Move class multipliers: PA(L)/Light 0.5, Medium 0.75, Heavy 1.0, Assault 1.5.
- Anti-mech bonus: +5 BV flat per trooper when Magnetic Clamps present (swarm-capable).
- Manipulator melee BV: Vibro-Claw 3, Heavy Claw 2, Battle Claw 1, else 0. Applied per manipulator (so a biped with Vibro-Claws on BOTH arms gets 6).
- Per-trooper offensive: `sum(weaponBV) + sum(ammoBV) + manipulatorBV`.
- squadBV = trooperBV × squadSize. Pilot skill multiplier applied to final.

## Unit data

- BA unit JSONs may not exist in `public/data/units/battlearmor/` yet — check and if absent, the parity harness should emit an empty-but-valid report with `squads: []` and document the defer.

## Wave 1 corrections (Atlas must apply)

- Complete ALL tasks end-to-end. No mid-run stop.
- Final Wave runs: `openspec validate --strict`, `npm run lint`, `npx oxfmt --check`, `npx jest <touched>`.
- Merge deltas into `openspec/specs/` before reporting done.
- Report includes per-task status table + spec coverage + deltas merged + files changed.

## Watch for

- oxfmt vs prettier hook conflicts — run `npx oxfmt --check` then `--write` if needed.
- Windows CRLF — Write not Edit for files with mixed line endings.
- Background jest false positives — if jest hangs or emits "workers died", re-run synchronously.
