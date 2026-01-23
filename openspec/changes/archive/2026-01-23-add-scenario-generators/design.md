# Design: Scenario and OpFor Generators

## Context

MekStation needs automated content generation for gameplay, similar to MekHQ's Against the Bot (AtB) and StratCon systems. This enables:
- Quick skirmish games without manual enemy setup
- Campaign missions with appropriate challenge scaling
- Variety through modifiers and scenario types

## Goals

- Generate balanced encounters based on player force strength
- Support multiple scenario types with different objectives
- Provide configurable difficulty (80%-140% BV scaling)
- Allow manual override of generated content

## Non-Goals

- Full StratCon strategic layer (hex-based planetary control)
- AI bot for playing enemy turns (separate concern)
- Real-time balance adjustments during battle

## Decisions

### Decision: BV-Based OpFor Scaling

Enemy forces are generated to match a target BV calculated from player force:

```
targetBV = playerForceBV × difficultyMultiplier
floor = targetBV × 0.9
ceiling = targetBV × 1.1
```

**Rationale**: BV (Battle Value) is the canonical BattleTech balance metric. MekHQ uses this approach successfully.

**Algorithm**:
1. Select a lance from appropriate RAT
2. If totalBV < floor, add another lance
3. If floor <= totalBV <= ceiling, roll 2d6:
   - 2-5: Stop (unlucky, smaller force)
   - 6-8: Add one more lance, then stop
   - 9+: Add one more lance, re-roll
4. If totalBV > ceiling, stop (over budget is allowed)

### Decision: Scenario Templates as Data

Scenario templates are defined as JSON data files, not code:

```json
{
  "id": "standup-fight",
  "name": "Standup Fight",
  "objectiveType": "destroy",
  "victoryConditions": [
    { "type": "destroy_percentage", "target": "enemy", "percentage": 50 }
  ],
  "deploymentZones": {
    "player": "south_edge",
    "enemy": "north_edge"
  }
}
```

**Rationale**: Data-driven approach allows easy addition of new scenarios without code changes. Users could eventually create custom templates.

### Decision: Modifier Categories

Modifiers are categorized by effect type:

| Category | Examples | Balance Impact |
|----------|----------|----------------|
| Positive | Allied reinforcements, artillery support | Helps player |
| Negative | Enemy reinforcements, minefield, ambush | Helps enemy |
| Neutral | Weather (affects both), sensor conditions | Situational |

Default configuration allows up to 3 modifiers per battle, rolled randomly. Campaign facilities can force specific modifiers.

### Decision: RAT Structure

Random Assignment Tables follow MegaMek's structure:

```typescript
interface IRAT {
  faction: string;
  era: string;
  unitType: 'mech' | 'vehicle' | 'infantry' | 'aerospace';
  entries: Array<{
    unitId: string;
    weight: number;  // Relative probability
  }>;
}
```

**Rationale**: Compatible with existing MegaMek data. Allows faction/era-appropriate unit selection.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 ScenarioGeneratorService                │
├─────────────────────────────────────────────────────────┤
│  generateScenario(config: IScenarioConfig)              │
│    ├── selectTemplate(objectiveType?)                   │
│    ├── generateOpFor(playerBV, difficulty, faction)     │
│    ├── rollModifiers(maxCount, facilities?)             │
│    └── selectTerrain(biome, temperature)                │
└─────────────────────────────────────────────────────────┘
           │              │              │
           ▼              ▼              ▼
   ┌───────────┐  ┌───────────┐  ┌───────────┐
   │ Templates │  │   RATs    │  │ Modifiers │
   │   (JSON)  │  │   (JSON)  │  │   (JSON)  │
   └───────────┘  └───────────┘  └───────────┘
```

## Difficulty Levels

| Level | BV Multiplier | Skill Range |
|-------|---------------|-------------|
| Ultra-Green | 80% | 6/7, 5/6 |
| Green | 90% | 5/6, 4/5 |
| Regular | 100% | 4/5, 3/4 |
| Veteran | 110% | 3/4, 2/3 |
| Elite | 120% | 2/3, 1/2 |
| Heroic | 130% | 1/2, 0/1 |
| Legendary | 140% | 0/1 |

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Generated forces may feel repetitive | Wide variety of modifiers, random lance selection |
| BV doesn't capture all balance factors | Allow manual adjustment, display warnings for quirky setups |
| RAT data maintenance burden | Start with core factions, allow community contributions |

## Open Questions

- Should generated scenarios be saveable as templates for reuse?
- How to handle aerospace/naval generation (different BV scaling)?
- Should modifiers stack or have mutual exclusion rules?
