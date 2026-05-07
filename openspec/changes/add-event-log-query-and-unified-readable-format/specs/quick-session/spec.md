## ADDED Requirements

### Requirement: Readable Event-Log Companion Columnar Layout

The Python utility at `scripts/format-event-log.py` (introduced by `Readable Event-Log Companion Formatter Contract`) SHALL emit one line per event in a **fixed-width columnar prefix + variable summary** layout so post-hoc analysis with `awk`, `grep`, `cut`, and column-position tools works without per-event-type regexes.

The prefix SHALL follow the format string:

```
s<seq:5d> t<turn:2d> <phase:8s> <side:9s> <actor:14s> <action:24s>  <action-summary>
```

| Column | Width | Source |
|---|---|---|
| `s<seq>` | 6 chars (`s` + 5-digit zero-padded sequence) | `event.sequence` |
| `t<turn>` | 3 chars (`t` + 2-digit zero-padded turn) | `event.turn` |
| `phase` | 8 chars (left-padded to 8) | `event.phase` value |
| `side` | 9 chars (left-padded to 9) | `event.side` if defined; else fall back to `'system   '` for events without `actorId`, or to `MetricsCollector.sideFromUnitId(event.actorId)` for legacy streams |
| `actor` | 14 chars (right-truncated to 14) | `event.actorId` if defined; else `'-'` left-padded to 14 |
| `action` | 24 chars (left-padded to 24) | `event.type` lowercased |
| 2 spaces | 2 chars | literal |
| summary | variable | per-action-category template (table below) |

The 6 columns plus 5 single-space separators yield a **69-char prefix**, the 2 literal spaces sit at columns 69-70, and the summary begins at column 71. Every event line uses the same fixed widths so `awk '$3 == "movement"'` and `grep ' player '` work without per-event-type regexes.

After the 74-char prefix and 2 literal spaces, the formatter SHALL emit a per-category summary using these templates:

| Category | Event types | Summary template |
|---|---|---|
| MOVE | `movement_declared`, `movement_locked` | `<from>→<to> mp=<n>(s<sh>+t<th>) disp=<d> [<step-kinds>]` where step-kinds is the comma-joined `IMovementStep.kind` chain (e.g. `forward,turn,forward`) when `payload.steps` is present, else `flags` from `payload.movementType` |
| WEAPON | `attack_declared`, `attack_resolved` | `→<target> <weapon> roll=<r>/<tn> <HIT\|MISS> loc=<l> dmg=<d>` |
| MELEE | `physical_attack_declared`, `physical_attack_resolved` | `→<target> <attackType> roll=<r>/<tn> <HIT\|MISS> dmg=<d> loc=<l>` |
| DAMAGE | `damage_applied`, `transfer_damage` | `<location> dmg=<d> armor=<armorRemaining> struct=<structureRemaining>` |
| CRIT | `critical_hit`, `critical_hit_resolved`, `component_destroyed` | `<location> slot=<n> <componentType>(<componentName>)` |
| HEAT | `heat_generated`, `heat_dissipated`, `heat_effect_applied` | `gen=<+n>/diss=<-n> total=<newTotal> effect=<threshold>` |
| PSR | `psr_triggered`, `psr_resolved`, `unit_fell`, `unit_stood`, `shutdown_check` | `<reason> tn=<n> roll=<r> <PASS\|FAIL>` |
| AMMO | `ammo_consumed`, `ammo_explosion` | `bin=<binId> rounds=<n>` or `bin=<binId> dmg=<d> loc=<l>` |
| LIFECYCLE | `unit_destroyed`, `location_destroyed`, `pilot_hit` | `<unitId> cause=<cause>` / `<location> via=<viaTransfer>` / `wounds=<n> source=<source>` |
| FLOW | `game_started`, `game_ended`, `turn_started`, `turn_ended`, `phase_changed`, `initiative_rolled` | per-event minimal (winner, phase, etc.) |

The fixed-width prefix is the **searchable frame** that lets users run `awk '$3 == "movement"'`, `grep ' player '`, `grep 'attack_resolved'` without per-category regex knowledge.

#### Scenario: Player-side movement event uses the canonical fixed-width prefix

- **GIVEN** a `movement_declared` event with `sequence: 42`, `turn: 5`, `phase: 'movement'`, `side: 'player'`, `actorId: 'player-1'`
- **WHEN** the formatter renders the event
- **THEN** the rendered line SHALL begin with `s00042 t05 movement player    player-1     ` (each column matching the widths in the table — 6, 3, 8, 9, 14, with single-space separators)
- **AND** the action column SHALL begin at character position 45 (zero-indexed)
- **AND** the per-category summary SHALL begin at character position 71

#### Scenario: System-authored event without actorId renders side as 'system' and actor as '-'

- **GIVEN** a `turn_started` event with no `actorId` (and therefore no envelope `side`)
- **WHEN** the formatter renders the event
- **THEN** the side column SHALL contain the literal string `system` (left-padded to 9 chars)
- **AND** the actor column SHALL contain the literal string `-` (left-padded to 14 chars)

#### Scenario: Legacy event stream without envelope side falls back to actorId-prefix lookup

- **GIVEN** a `damage_applied` event with `actorId: 'player-1'` and no `side` field (legacy stream from before PR B)
- **WHEN** the formatter renders the event
- **THEN** the side column SHALL contain `player` (derived from the `'player-'` prefix on `actorId`)

#### Scenario: Movement event with steps array shows the chain decomposition

- **GIVEN** a `movement_declared` event with `payload.mpUsed: 5`, `straightHexes: 4`, `turningMpCost: 1`, `netDisplacement: 4`, `steps: [forward, forward, turn, forward, forward]` (5 entries)
- **WHEN** the formatter renders the event
- **THEN** the action-summary SHALL contain `mp=5(s4+t1)` and `disp=4` and `[forward,forward,turn,forward,forward]` (or an equivalent comma-joined kind list)
