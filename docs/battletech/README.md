# BattleTech Documentation

## Source of Truth

All BattleTech construction rules and formulas are documented in **OpenSpec**:

```
openspec/specs/
├── construction-rules-core/     # Weight limits, structure rules
├── engine-system/               # Engine weight, ratings
├── gyro-system/                 # Gyro weight formulas
├── armor-system/                # Armor points, allocation
├── movement-system/             # Walk/Run/Jump MP, MASC, Supercharger
├── heat-sink-system/            # Heat dissipation
├── weapon-system/               # Weapon stats
├── ammunition-system/           # Ammo compatibility
├── electronics-system/          # Targeting computers, ECM, C3
├── equipment-database/          # Variable equipment calculations
├── physical-weapons-system/     # Melee weapon formulas
├── critical-slot-allocation/    # Slot distribution
└── ...
```

## Viewing Specs

```bash
# List all specs
npx openspec list --specs

# View a specific spec
npx openspec show movement-system --type spec

# Search for content
rg "MASC" openspec/specs/
```

## TechManual References

Formulas in OpenSpec specs include TechManual page references in the scenario descriptions.

## Legacy Documentation

The `docs/battletech/agents/` folder has been deprecated. All content has been migrated to OpenSpec specs.

