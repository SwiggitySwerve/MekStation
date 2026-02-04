# Encounter History Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-02-02
**Dependencies**: data-model.md, simulation-system (completed)
**Affects**: shared-components.md, campaign-dashboard.md

---

## Overview

### Purpose
Provides detailed battle records with damage attribution, key moments, and event timelines for analyzing individual encounters. Enables users to review "what happened in each battle" with drill-down from summary to turn-by-turn playback.

### Scope
**In Scope:**
- Battle list with grouping, filtering, and sorting
- Battle detail view with forces, damage, kills, duration
- Damage attribution matrix (who damaged whom grid)
- Key moment detection and display (tier 1/2/3 classification)
- Event timeline with turn-by-turn playback and VCR controls
- Comparison view (this battle vs campaign average)

**Out of Scope:**
- Real-time battle monitoring (batch only)
- AI decision visualization (utility scores) - future enhancement
- Export to external formats (JSON/CSV) - future enhancement
- Comparison across multiple campaigns - future enhancement

### Key Concepts
- **Battle Record**: Complete data for a single encounter (forces, events, outcome, metrics)
- **Key Moment**: Auto-detected significant event (first blood, BV swing, critical hit) with tier-based significance
- **Damage Attribution**: Grid showing total damage dealt by each attacker to each target
- **Event Timeline**: Turn-by-turn sequence of all battle events with playback controls
- **Comparison Baseline**: Reference metrics (campaign average or specific battle) for comparison

---

## Requirements

### Requirement: Battle List Display
The system SHALL display a filterable, sortable list of all battles grouped by mission/contract with summary metrics.

**Rationale**: Users need to quickly find specific battles and understand their outcomes at a glance.

**Priority**: Critical

#### Scenario: Display battles grouped by mission
**GIVEN** a campaign with 3 missions containing 2, 1, and 3 battles respectively
**WHEN** the user opens the Encounter History tab
**THEN** the battle list SHALL display 3 mission groups
**AND** each group SHALL show the mission name, date, and battle count
**AND** battles within each group SHALL be sorted by date (newest first)
**AND** each battle SHALL show: opponent, outcome (win/loss/draw), turns, kills, damage

#### Scenario: Filter battles by outcome
**GIVEN** a campaign with 5 wins, 2 losses, 1 draw
**WHEN** the user selects "Wins" filter
**THEN** the battle list SHALL display only the 5 winning battles
**AND** the mission groups SHALL only show missions containing wins
**AND** the filter chip SHALL show "Wins (5)"

#### Scenario: Sort battles by duration
**GIVEN** a mission with 3 battles (15 turns, 8 turns, 22 turns)
**WHEN** the user selects "Sort by: Duration (longest first)"
**THEN** the battles SHALL be reordered: 22 turns, 15 turns, 8 turns
**AND** the grouping by mission SHALL be preserved
**AND** the sort selection SHALL persist across tab switches

### Requirement: Battle Detail View
The system SHALL display comprehensive battle details including forces, damage breakdown, kills, and duration when a battle is selected.

**Rationale**: Users need detailed information about a specific battle to analyze performance and outcomes.

**Priority**: Critical

#### Scenario: Display battle forces
**GIVEN** a battle with 4 player units (2 mechs, 2 vehicles) vs 3 enemy units (3 mechs)
**WHEN** the user clicks on the battle in the list
**THEN** the detail view SHALL display two force panels (Player, Enemy)
**AND** each panel SHALL show: unit name, pilot, BV, status (operational/damaged/destroyed)
**AND** destroyed units SHALL be visually distinguished (grayed out, strikethrough)
**AND** clicking a unit SHALL highlight its row in the damage matrix

#### Scenario: Display battle outcome summary
**GIVEN** a battle that lasted 15 turns with 3 kills, 2500 total damage, 18 minutes duration
**WHEN** the detail view is displayed
**THEN** the summary section SHALL show:
- Outcome: Win/Loss/Draw with visual indicator (green/red/yellow)
- Duration: "15 turns (18m 32s)"
- Kills: "3 enemy units destroyed"
- Damage: "2,500 total damage dealt"
- BV Destroyed: "4,500 BV eliminated"

#### Scenario: Empty battle (no damage dealt)
**GIVEN** a battle where both sides retreated without dealing damage
**WHEN** the detail view is displayed
**THEN** the summary SHALL show "0 total damage dealt"
**AND** the damage matrix SHALL be empty (no cells with values)
**AND** the key moments list SHALL be empty or show only "Battle started" and "Battle ended"

### Requirement: Damage Attribution Matrix
The system SHALL display a grid visualization showing total damage dealt by each attacker to each target.

**Rationale**: Users need to understand engagement patterns and focus fire effectiveness.

**Priority**: High

#### Scenario: Display damage matrix
**GIVEN** a battle where Atlas damaged Timber Wolf (150) and Mad Cat (80), and Marauder damaged Timber Wolf (120)
**WHEN** the damage matrix is displayed
**THEN** the grid SHALL have:
- Rows: Player units (Atlas, Marauder)
- Columns: Enemy units (Timber Wolf, Mad Cat)
- Cell [Atlas, Timber Wolf]: "150"
- Cell [Atlas, Mad Cat]: "80"
- Cell [Marauder, Timber Wolf]: "120"
- Cell [Marauder, Mad Cat]: empty (no damage)

#### Scenario: Highlight focused target
**GIVEN** a damage matrix where Timber Wolf received damage from 3 different attackers
**WHEN** the user hovers over the Timber Wolf column
**THEN** the column SHALL be highlighted
**AND** a tooltip SHALL show "Total damage received: 420 (from 3 attackers)"
**AND** the cells in that column SHALL show percentage of total (e.g., "150 (36%)")

#### Scenario: Drill down to engagement events
**GIVEN** a damage matrix cell showing "150" damage
**WHEN** the user clicks on the cell
**THEN** the event timeline SHALL scroll to the first engagement between those units
**AND** all engagement events between those units SHALL be highlighted
**AND** a filter chip SHALL appear: "Atlas → Timber Wolf (5 attacks)"

### Requirement: Key Moment Detection
The system SHALL automatically detect and classify significant battle events into three tiers based on impact and rarity.

**Rationale**: Users need to quickly identify critical turning points without reviewing every event.

**Priority**: High

#### Scenario: Detect first blood (Tier 1)
**GIVEN** a battle where the first damage occurs on turn 3 (Atlas damages Timber Wolf for 15)
**WHEN** the key moment detector processes the event stream
**THEN** it SHALL create a Tier 1 key moment with:
- Type: "first-blood"
- Turn: 3
- Description: "First blood: Atlas AS7-D damaged Timber Wolf Prime for 15 damage"
- Related units: [Atlas, Timber Wolf]

#### Scenario: Detect BV swing (Tier 1)
**GIVEN** a battle where player BV advantage changes from -30% to +10% in one turn (40% swing)
**WHEN** the key moment detector processes turn 8
**THEN** it SHALL create a Tier 1 key moment with:
- Type: "bv-swing-major"
- Turn: 8
- Description: "Major BV swing: +40% (from -30% to +10%)"
- Metadata: { bvBefore: -30, bvAfter: 10, swingPercent: 40 }

#### Scenario: Detect head shot (Tier 2)
**GIVEN** a battle where Atlas hits Timber Wolf in the head for 15 damage on turn 5
**WHEN** the key moment detector processes the attack event
**THEN** it SHALL create a Tier 2 key moment with:
- Type: "head-shot"
- Turn: 5
- Description: "Head shot: Atlas AS7-D hit Timber Wolf Prime in the head for 15 damage"
- Metadata: { damage: 15, location: "head", attackerId: "...", targetId: "..." }

#### Scenario: Detect heat crisis (Tier 3)
**GIVEN** a battle where Atlas shuts down from heat on turn 6
**WHEN** the key moment detector processes the heat phase
**THEN** it SHALL create a Tier 3 key moment with:
- Type: "heat-crisis"
- Turn: 6
- Description: "Heat shutdown: Atlas AS7-D shut down (35 heat)"
- Metadata: { heat: 35, unitId: "..." }

#### Scenario: Multiple key moments in same turn
**GIVEN** turn 5 has both a head shot AND an ammo explosion
**WHEN** the detector processes the turn
**THEN** it SHALL create TWO separate key moments
**AND** both SHALL have turn: 5
**AND** they SHALL be sorted by timestamp within the turn
**AND** the timeline SHALL display both with their respective tier badges

### Requirement: Key Moment Filtering
The system SHALL allow users to filter key moments by tier and type to reduce noise.

**Rationale**: Tier 3 moments can be numerous; users should be able to focus on high-impact events.

**Priority**: Medium

#### Scenario: Default filter (Tier 1+2)
**GIVEN** a battle with 5 Tier 1, 12 Tier 2, and 38 Tier 3 key moments
**WHEN** the user opens the battle detail view
**THEN** the key moments list SHALL display only Tier 1 and Tier 2 moments (17 total)
**AND** a filter indicator SHALL show "Showing Tier 1+2 (17 of 55 moments)"
**AND** a toggle SHALL be available: "Show Tier 3 moments"

#### Scenario: Show all tiers
**GIVEN** the default filter is active (Tier 1+2)
**WHEN** the user toggles "Show Tier 3 moments"
**THEN** the key moments list SHALL display all 55 moments
**AND** Tier 3 moments SHALL be visually de-emphasized (smaller badge, muted color)
**AND** the filter indicator SHALL update: "Showing all tiers (55 moments)"

#### Scenario: Filter by type
**GIVEN** a battle with 3 head shots, 2 ammo explosions, 1 pilot kill
**WHEN** the user selects "Filter by type: Head shots"
**THEN** the key moments list SHALL display only the 3 head shot moments
**AND** the filter chip SHALL show "Head shots (3)"
**AND** the timeline SHALL highlight only the turns containing head shots

### Requirement: Event Timeline Display
The system SHALL display a vertical timeline of all battle events grouped by turn with phase indicators.

**Rationale**: Users need to review the sequence of events in a natural reading flow.

**Priority**: Critical

#### Scenario: Display timeline grouped by turn
**GIVEN** a battle with 15 turns, each containing 5-10 events
**WHEN** the user views the event timeline
**THEN** the timeline SHALL display 15 turn groups
**AND** each turn group SHALL show: turn number, phase breakdown, event count
**AND** events within each turn SHALL be grouped by phase (movement, weapon-attack, physical-attack, heat, end)
**AND** the timeline SHALL use vertical layout (top to bottom)

#### Scenario: Expand/collapse turn groups
**GIVEN** a timeline with 15 turns
**WHEN** the user clicks on turn 5 header
**THEN** turn 5 SHALL expand to show all events
**AND** other turns SHALL remain collapsed (showing only summary)
**AND** the expansion state SHALL persist during playback
**AND** a "Expand all" / "Collapse all" button SHALL be available

#### Scenario: Display event details
**GIVEN** an expanded turn showing a weapon attack event
**WHEN** the event is displayed
**THEN** it SHALL show:
- Icon: ⚔️ (weapon attack)
- Attacker: "Atlas AS7-D"
- Action: "fired AC/20 at"
- Target: "Timber Wolf Prime"
- Result: "15 damage to CT"
- Timestamp: "Turn 5, Weapon Attack Phase"

### Requirement: VCR Playback Controls
The system SHALL provide VCR-style controls for replaying battle events with speed adjustment.

**Rationale**: Users need to step through battles at their own pace to analyze decisions.

**Priority**: High

#### Scenario: Play/pause timeline
**GIVEN** a battle timeline at turn 1
**WHEN** the user clicks the "Play" button
**THEN** the timeline SHALL auto-advance through events at 1x speed (1 event per second)
**AND** the current event SHALL be highlighted
**AND** the turn group SHALL auto-expand as events are played
**AND** the "Play" button SHALL change to "Pause"

#### Scenario: Adjust playback speed
**GIVEN** the timeline is playing at 1x speed
**WHEN** the user selects "2x speed"
**THEN** the playback SHALL advance at 2 events per second
**AND** the speed indicator SHALL show "2x"
**AND** the speed SHALL persist across pause/resume

#### Scenario: Step forward/backward
**GIVEN** the timeline is paused at turn 5, event 3
**WHEN** the user clicks "Step forward"
**THEN** the timeline SHALL advance to turn 5, event 4
**AND** the event SHALL be highlighted
**AND** if event 4 is the last event in turn 5, the next step SHALL go to turn 6, event 1

#### Scenario: Jump to turn
**GIVEN** a timeline with 15 turns
**WHEN** the user clicks on turn 10 in the turn list
**THEN** the timeline SHALL scroll to turn 10
**AND** turn 10 SHALL expand
**AND** the playback position SHALL be set to turn 10, event 1
**AND** if playback is active, it SHALL continue from turn 10

#### Scenario: Playback completion
**GIVEN** the timeline is playing and reaches the last event
**WHEN** the last event is displayed
**THEN** the playback SHALL automatically pause
**AND** the "Pause" button SHALL change back to "Play"
**AND** a notification SHALL appear: "Battle replay complete"
**AND** clicking "Play" again SHALL restart from turn 1

### Requirement: Battle Comparison View
The system SHALL display a comparison of the current battle against campaign average or a specific battle.

**Rationale**: Users need context to understand if a battle was typical or exceptional.

**Priority**: Medium

#### Scenario: Compare to campaign average
**GIVEN** a battle with 15 turns, 3 kills, 2500 damage
**AND** campaign average is 12 turns, 2 kills, 2000 damage
**WHEN** the user selects "Compare to: Campaign Average"
**THEN** the comparison view SHALL display:
- Turns: "15 (+3, +25%)" with green/red indicator
- Kills: "3 (+1, +50%)" with green indicator
- Damage: "2,500 (+500, +25%)" with green indicator
- Duration: "18m 32s (+3m 12s, +21%)"

#### Scenario: Compare to specific battle
**GIVEN** the user selects "Compare to: Battle #5"
**WHEN** the comparison is displayed
**THEN** the baseline SHALL be Battle #5 metrics
**AND** the comparison header SHALL show "vs Battle #5 (Mission: Recon Alpha)"
**AND** a link SHALL be available: "View Battle #5"

#### Scenario: No baseline available (first battle)
**GIVEN** a campaign with only 1 battle
**WHEN** the user opens the comparison view
**THEN** it SHALL display "No comparison data available (first battle)"
**AND** the comparison controls SHALL be disabled
**AND** a message SHALL explain: "Comparison will be available after 2+ battles"

---

## Data Model Requirements

### Required Interfaces

The implementation MUST use the following TypeScript interfaces from `data-model.md`:

- **`IKeyMoment`**: Represents a significant battle event with tier-based classification
- **`IBattleComparisonData`**: Comparison data for a battle vs baseline
- **`IBattleMetrics`**: Metrics for a single battle (turns, kills, damage, duration, BV destroyed)

### Required Properties

See `data-model.md` for complete property definitions. Key properties:

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `IKeyMoment.tier` | `1 \| 2 \| 3` | Yes | Significance tier | 1, 2, or 3 | N/A |
| `IKeyMoment.type` | `KeyMomentType` | Yes | Type of key moment | See `KeyMomentType` enum | N/A |
| `IBattleComparisonData.baselineType` | `string` | Yes | Type of baseline | "campaign-average", "specific-battle" | N/A |

### Type Constraints

- `IKeyMoment.tier` MUST be 1, 2, or 3 (no other values allowed)
- `IKeyMoment.turn` MUST be a positive integer (>= 1)
- When `IBattleComparisonData.baselineType` is "specific-battle", `comparisonBattleId` MUST be present

---

## Calculation Formulas

### Key Moment Detection Algorithm

**Tier 1 (High Significance)**:

1. **First Blood**: First damage dealt in battle
   ```
   IF event.type === "damage" AND battle.totalDamageDealt === 0 THEN
     CREATE KeyMoment(type="first-blood", tier=1)
   ```

2. **BV Swing Major**: BV advantage changes by >20% in one turn
   ```
   bvSwing = abs(currentTurn.bvAdvantage - previousTurn.bvAdvantage)
   IF bvSwing > 0.20 THEN
     CREATE KeyMoment(type="bv-swing-major", tier=1, metadata={ swingPercent: bvSwing * 100 })
   ```

3. **Comeback**: Losing side (BV < -20%) recovers to win
   ```
   IF battle.outcome === "win" AND min(battle.bvAdvantageHistory) < -0.20 THEN
     CREATE KeyMoment(type="comeback", tier=1)
   ```

4. **Wipe**: All enemy units destroyed
   ```
   IF enemyUnits.every(u => u.status === "destroyed") THEN
     CREATE KeyMoment(type="wipe", tier=1)
   ```

5. **Last Stand**: Single unit vs 3+ enemies
   ```
   IF playerUnits.filter(u => u.operational).length === 1 AND
      enemyUnits.filter(u => u.operational).length >= 3 THEN
     CREATE KeyMoment(type="last-stand", tier=1)
   ```

6. **Ace Kill**: 3+ kills by one unit
   ```
   IF unit.kills >= 3 THEN
     CREATE KeyMoment(type="ace-kill", tier=1, metadata={ kills: unit.kills })
   ```

**Tier 2 (Medium Significance)**:

1. **Head Shot**: Attack hits head location
   ```
   IF attack.location === "head" AND attack.damage > 0 THEN
     CREATE KeyMoment(type="head-shot", tier=2)
   ```

2. **Ammo Explosion**: Ammo critical causes explosion
   ```
   IF critical.type === "ammo" AND critical.exploded === true THEN
     CREATE KeyMoment(type="ammo-explosion", tier=2)
   ```

3. **Pilot Kill**: Pilot killed (not unit destroyed)
   ```
   IF event.type === "pilot-killed" THEN
     CREATE KeyMoment(type="pilot-kill", tier=2)
   ```

4. **Critical Engine/Gyro**: Engine or gyro destroyed
   ```
   IF critical.component === "engine" OR critical.component === "gyro" THEN
     CREATE KeyMoment(type="critical-engine" OR "critical-gyro", tier=2)
   ```

5. **Alpha Strike**: Unit fires all weapons
   ```
   IF weaponsFired.length === unit.weapons.length AND unit.weapons.length >= 4 THEN
     CREATE KeyMoment(type="alpha-strike", tier=2)
   ```

6. **Focus Fire**: 3+ units attack same target in one turn
   ```
   attacksOnTarget = turn.attacks.filter(a => a.targetId === targetId)
   IF attacksOnTarget.length >= 3 THEN
     CREATE KeyMoment(type="focus-fire", tier=2)
   ```

**Tier 3 (Low Significance)**:

1. **Heat Crisis**: Unit shuts down from heat
   ```
   IF unit.heat >= 30 AND unit.shutdown === true THEN
     CREATE KeyMoment(type="heat-crisis", tier=3)
   ```

2. **Mobility Kill**: Leg/hip destroyed
   ```
   IF critical.location IN ["left-leg", "right-leg", "left-hip", "right-hip"] THEN
     CREATE KeyMoment(type="mobility-kill", tier=3)
   ```

3. **Weapons Kill**: All weapons destroyed
   ```
   IF unit.weapons.every(w => w.destroyed) THEN
     CREATE KeyMoment(type="weapons-kill", tier=3)
   ```

4. **Rear Arc Hit**: Attack from rear arc
   ```
   IF attack.arc === "rear" THEN
     CREATE KeyMoment(type="rear-arc-hit", tier=3)
   ```

5. **Overkill**: Damage exceeds remaining armor by 50%
   ```
   IF attack.damage > (target.remainingArmor * 1.5) THEN
     CREATE KeyMoment(type="overkill", tier=3)
   ```

### BV Advantage Calculation

**Formula**:
```
playerBV = sum(playerUnits.filter(u => u.operational).map(u => u.bv))
enemyBV = sum(enemyUnits.filter(u => u.operational).map(u => u.bv))
bvAdvantage = (playerBV - enemyBV) / (playerBV + enemyBV)
```

**Where**:
- `playerBV` = Total BV of operational player units
- `enemyBV` = Total BV of operational enemy units
- `bvAdvantage` = Normalized advantage (-1.0 to +1.0)

**Example**:
```
Input: playerBV = 6000, enemyBV = 4000
Calculation: bvAdvantage = (6000 - 4000) / (6000 + 4000) = 2000 / 10000 = 0.20
Output: +20% BV advantage
```

**Special Cases**:
- When `enemyBV === 0`: `bvAdvantage = 1.0` (complete victory)
- When `playerBV === 0`: `bvAdvantage = -1.0` (complete defeat)
- When both are 0: `bvAdvantage = 0.0` (no forces)

### Comparison Delta Calculation

**Formula**:
```
delta.metric = current.metric - baseline.metric
deltaPercent = (delta.metric / baseline.metric) * 100
```

**Example**:
```
Input: current.turns = 15, baseline.turns = 12
Calculation: delta.turns = 15 - 12 = 3
             deltaPercent = (3 / 12) * 100 = 25%
Output: "+3 turns (+25%)"
```

**Special Cases**:
- When `baseline.metric === 0`: Display delta as absolute value only (no percentage)
- When `delta.metric > 0`: Display with "+" prefix and green color
- When `delta.metric < 0`: Display with "-" prefix and red color
- When `delta.metric === 0`: Display "No change" in gray

---

## Validation Rules

### Validation: Battle Record Completeness

**Rule**: Battle record must have all required fields before display

**Severity**: Error

**Condition**:
```typescript
if (!battle.id || !battle.forces || !battle.events || !battle.outcome) {
  // invalid - cannot display
} else {
  // valid
}
```

**Error Message**: "Battle record incomplete: missing required fields"

**User Action**: Contact support (this should never happen in production)

### Validation: Key Moment Tier Consistency

**Rule**: Key moment tier must match its type

**Severity**: Warning

**Condition**:
```typescript
const tierMap = {
  "first-blood": 1, "bv-swing-major": 1, "comeback": 1, "wipe": 1, "last-stand": 1, "ace-kill": 1,
  "head-shot": 2, "ammo-explosion": 2, "pilot-kill": 2, "critical-engine": 2, "critical-gyro": 2, "alpha-strike": 2, "focus-fire": 2,
  "heat-crisis": 3, "mobility-kill": 3, "weapons-kill": 3, "rear-arc-hit": 3, "overkill": 3
};

if (keyMoment.tier !== tierMap[keyMoment.type]) {
  // invalid - tier mismatch
}
```

**Error Message**: "Key moment tier mismatch: {type} should be tier {expected}, got tier {actual}"

**User Action**: Report bug (this indicates a detector error)

### Validation: Comparison Baseline Availability

**Rule**: Comparison baseline must exist before displaying comparison

**Severity**: Info

**Condition**:
```typescript
if (battles.length < 2 && baselineType === "campaign-average") {
  // invalid - not enough data
} else if (baselineType === "specific-battle" && !comparisonBattle) {
  // invalid - comparison battle not found
} else {
  // valid
}
```

**Error Message**: "Comparison not available: {reason}"

**User Action**: Wait for more battles or select a different baseline

---

## Dependencies

### Depends On
- **data-model.md**: Uses `IKeyMoment`, `IBattleComparisonData`, `IBattleMetrics` interfaces
- **simulation-system**: Uses battle event stream, game state, unit data

### Used By
- **shared-components.md**: Timeline, VCR controls, damage matrix components
- **campaign-dashboard.md**: Links to battle details from dashboard metrics

### Construction Sequence
1. Simulation system generates battle events and final state
2. Key moment detector processes event stream (during or after battle)
3. Battle record is created with metrics, key moments, and events
4. Encounter History tab displays battle list and detail views
5. User interacts with timeline, filters, and comparison views

---

## Implementation Notes

### Performance Considerations
- **Key moment detection**: Run once per battle, cache results in battle record (don't recompute on every render)
- **Event timeline**: Virtualize long timelines (100+ events) to avoid rendering all at once
- **Damage matrix**: Pre-compute totals, don't recalculate on every hover
- **Playback**: Use requestAnimationFrame for smooth animation, debounce speed changes

### Edge Cases
- **Empty battles**: No damage dealt, no key moments (display "No significant events")
- **Very long battles**: 100+ turns (virtualize timeline, add "Jump to turn" control)
- **Single-unit battles**: 1v1 (some key moments like "focus fire" won't trigger)
- **Instant victories**: Battle ends turn 1 (timeline still shows all events)

### Common Pitfalls
- **Pitfall**: Recalculating key moments on every render
  - **Solution**: Detect once, store in battle record, read from cache
- **Pitfall**: Rendering all 500+ events in a long battle
  - **Solution**: Use react-window or react-virtualized for timeline
- **Pitfall**: Hardcoding tier colors in components
  - **Solution**: Use Tailwind classes based on tier value (tier-1 → red, tier-2 → orange, tier-3 → yellow)
- **Pitfall**: Not handling missing comparison baseline gracefully
  - **Solution**: Check availability before rendering, show helpful message

---

## Examples

### Example 1: Battle List Item

**Input**:
```typescript
const battle = {
  id: "battle_abc123",
  missionId: "mission_recon_alpha",
  missionName: "Recon Alpha",
  date: "2026-02-01",
  opponent: "Jade Falcon Cluster",
  outcome: "win",
  turns: 15,
  kills: 3,
  totalDamage: 2500,
  duration: 1112000 // milliseconds
};
```

**Display**:
```
Mission: Recon Alpha (2026-02-01)
  ✓ vs Jade Falcon Cluster - Victory
    15 turns | 3 kills | 2,500 damage | 18m 32s
```

### Example 2: Key Moment Detection (First Blood)

**Input**:
```typescript
const event = {
  type: "damage",
  turn: 3,
  phase: "weapon-attack",
  attackerId: "unit_atlas_001",
  targetId: "unit_timberwolf_002",
  damage: 15,
  location: "CT"
};

const battle = {
  totalDamageDealt: 0 // No damage yet
};
```

**Processing**:
```typescript
// Detector logic
if (event.type === "damage" && battle.totalDamageDealt === 0) {
  const keyMoment: IKeyMoment = {
    id: "km_battle_abc123_turn3_firstblood",
    type: "first-blood",
    tier: 1,
    turn: 3,
    phase: "weapon-attack",
    description: "First blood: Atlas AS7-D damaged Timber Wolf Prime for 15 damage",
    relatedUnitIds: ["unit_atlas_001", "unit_timberwolf_002"],
    metadata: {
      damage: 15,
      location: "CT",
      attackerId: "unit_atlas_001",
      targetId: "unit_timberwolf_002"
    },
    timestamp: Date.now()
  };
}
```

**Output**:
```
Timeline display:
  [Turn 3] 🔴 First blood: Atlas AS7-D damaged Timber Wolf Prime for 15 damage
```

### Example 3: Damage Attribution Matrix

**Input**:
```typescript
const attacks = [
  { attackerId: "atlas", targetId: "timberwolf", damage: 150 },
  { attackerId: "atlas", targetId: "madcat", damage: 80 },
  { attackerId: "marauder", targetId: "timberwolf", damage: 120 },
  { attackerId: "marauder", targetId: "timberwolf", damage: 50 }
];
```

**Processing**:
```typescript
// Aggregate damage by attacker-target pair
const matrix = {};
attacks.forEach(a => {
  const key = `${a.attackerId}-${a.targetId}`;
  matrix[key] = (matrix[key] || 0) + a.damage;
});

// Result:
// matrix["atlas-timberwolf"] = 150
// matrix["atlas-madcat"] = 80
// matrix["marauder-timberwolf"] = 170
```

**Output**:
```
Damage Matrix:
              Timber Wolf  Mad Cat
Atlas              150        80
Marauder           170         -
```

### Example 4: Battle Comparison

**Input**:
```typescript
const current: IBattleMetrics = {
  turns: 15,
  kills: 3,
  totalDamage: 2500,
  averageDamagePerTurn: 166.67,
  duration: 1112000,
  bvDestroyed: 4500
};

const baseline: IBattleMetrics = {
  turns: 12,
  kills: 2,
  totalDamage: 2000,
  averageDamagePerTurn: 166.67,
  duration: 890000,
  bvDestroyed: 3500
};
```

**Processing**:
```typescript
const delta: IBattleMetrics = {
  turns: current.turns - baseline.turns, // 3
  kills: current.kills - baseline.kills, // 1
  totalDamage: current.totalDamage - baseline.totalDamage, // 500
  averageDamagePerTurn: current.averageDamagePerTurn - baseline.averageDamagePerTurn, // 0
  duration: current.duration - baseline.duration, // 222000
  bvDestroyed: current.bvDestroyed - baseline.bvDestroyed // 1000
};

const deltaPercent = {
  turns: (delta.turns / baseline.turns) * 100, // 25%
  kills: (delta.kills / baseline.kills) * 100, // 50%
  totalDamage: (delta.totalDamage / baseline.totalDamage) * 100, // 25%
  // ...
};
```

**Output**:
```
Comparison vs Campaign Average:
  Turns:    15 (+3, +25%) 🔴
  Kills:    3 (+1, +50%) 🟢
  Damage:   2,500 (+500, +25%) 🟢
  Duration: 18m 32s (+3m 42s, +25%) 🔴
  BV Lost:  4,500 (+1,000, +29%) 🟢
```

---

## References

### Official BattleTech Rules
- **Total Warfare**: Combat phases (page 8), Battle outcomes (page 258)
- **TechManual**: Battle Value (page 315)

### Related Documentation
- `openspec/changes/simulation-viewer-ui/specs/data-model.md` - TypeScript interfaces
- `openspec/changes/simulation-viewer-ui/proposal.md` - Original proposal and user stories
- `src/simulation/core/GameState.ts` - Core game state interface
- `.sisyphus/notepads/simulation-viewer-specs/learnings.md` - UI research findings

### UI Pattern Research
- Vertical timeline: Natural reading flow, scales well (research: ses_3e01521c8ffemQx7DML9ffemG7)
- VCR controls: Play, pause, step forward/back, speed control (standard pattern)
- Damage matrix: Grid visualization (rows=attackers, columns=targets)
- Key moment tiers: Color-coded badges (red=tier 1, orange=tier 2, yellow=tier 3)

---

## Changelog

### Version 1.0 (2026-02-02)
- Initial specification
- Defined battle list, detail view, damage matrix, key moments, timeline, comparison requirements
- Established key moment detection algorithm with tier assignments
- Defined VCR playback controls and event timeline structure
- Added validation rules for battle records and key moments
- Provided concrete examples for all major features
