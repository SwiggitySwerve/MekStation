# Change: Add BattleArmor Battle Value

## Why

BA squads are costed in contracts by BV, so BA BV=0 materially breaks campaign balance wherever hostile BA appear. Current spec even explicitly flags "detailed BA BV calculation beyond simplified armor-based formula" as out of scope. This change adds the full BV 2.0 BA formula per TechManual so BA squads price correctly. It depends on `add-battlearmor-construction` for legal inputs.

## What Changes

- Add per-trooper BV = (offensive BV + defensive BV) × squad-size multiplier
- Add per-trooper defensive BV: armor BV + move BV + anti-mech flag bonus
- Add per-trooper offensive BV: weapon BV + ammo BV + manipulator melee BV
- Add move BV = MP × class multiplier (PA(L)/Light: 0.5; Medium: 0.75; Heavy: 1.0; Assault: 1.5)
- Add armor BV = armorPoints × 2.5 × armorTypeMultiplier (Stealth 1.5, Mimetic 1.5, Reactive 1.3, Reflective 1.3, Fire-Resistant 1.1, Standard 1.0)
- Add anti-mech bonus: Magnetic Clamps + swarm capability add flat 5 BV per trooper
- Add manipulator melee BV: Vibro-Claw 3 BV, Heavy Claw 2 BV, Battle Claw 1 BV
- Add squad-size multiplier: 4 troopers = 4.0×, 5 troopers = 5.0×, etc. (simple linear)
- Add pilot skill multiplier using shared gunnery/piloting table
- Expose breakdown on unit for UI
- Add parity harness comparing against MegaMekLab canonical BA

## Non-goals

- Field-gun BV (field guns are infantry, handled in `add-infantry-battle-value`)
- Mixed-squad BV (non-homogeneous squads)

## Dependencies

- **Requires**: `add-battlearmor-construction`, `battle-value-system`
- **Blocks**: `add-battlearmor-combat-behavior` (AI prioritization)

## Impact

- **Affected specs**: `battle-value-system` (MODIFIED — BA path), `battle-armor-unit-system` (MODIFIED — remove "simplified BV" scope exclusion; ADDED BV breakdown)
- **Affected code**: `src/utils/construction/battlearmor/battleArmorBV.ts` (new), `src/utils/construction/battleValueCalculations.ts` (dispatch), `src/components/customizer/battlearmor/BattleArmorStatusBar.tsx` (new or existing)
- **Validation target**: ≥ 95% within 5% vs canonical (BA BV is simpler math than mechs so parity should converge fast)
