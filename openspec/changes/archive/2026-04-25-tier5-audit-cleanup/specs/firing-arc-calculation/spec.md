## ADDED Requirements

### Requirement: Vehicle Chin Turret Pivot Penalty

When a ground vehicle fires a weapon mounted in a chin turret, and the turret has pivoted from its previous facing during the same turn, the to-hit calculation SHALL apply a +1 to-hit modifier (equivalent to a −1 effective gunnery skill) to that weapon attack.

This requirement closes a half-implemented item from archived `add-vehicle-combat-behavior` task 9.3. The 360° chin-turret arc shipped in that change; the pivot-penalty modifier was deferred without a pickup task. Per the Tier 5 audit, the penalty is small in scope and the rule is canonical (mirrors MegaMek `Tank.java` chin-turret handling), so it is being landed rather than de-scoped.

#### Scenario: Chin-turret weapon fires after pivoting in same turn

- **WHEN** a ground vehicle's chin turret pivoted from facing N to facing N+1 during the current turn
- **AND** a weapon mounted in that chin turret fires at a target within the (now-current) firing arc
- **THEN** the to-hit calculation includes a `+1` modifier with attribution `chin-turret-pivot`
- **AND** the resulting modified to-hit number reflects the penalty in the modifier breakdown

#### Scenario: Chin-turret weapon fires without pivoting

- **WHEN** a ground vehicle's chin turret has not pivoted during the current turn
- **AND** a weapon mounted in that chin turret fires at a target within the firing arc
- **THEN** the to-hit calculation does NOT include the chin-turret-pivot modifier

#### Scenario: Non-chin-turret weapon unaffected by chin-turret pivot

- **WHEN** a ground vehicle's chin turret pivoted during the current turn
- **AND** a weapon mounted in a body or sponson location fires
- **THEN** the to-hit calculation for the body/sponson weapon does NOT include the chin-turret-pivot modifier
