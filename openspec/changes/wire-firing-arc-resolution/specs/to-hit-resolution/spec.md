# to-hit-resolution (delta)

## ADDED Requirements

### Requirement: Hit Location Table Selected by Computed Arc

The hit-location table used during damage resolution SHALL be selected by the arc computed at attack time, not a default front table.

#### Scenario: Front-arc attack uses front table

- **GIVEN** an attack resolved from the front arc
- **WHEN** hit location is rolled
- **THEN** the front 2d6 table SHALL be consulted (2=CT(TAC), 3-4=RA, 5=RL, 6=RT, 7=CT, 8=LT, 9=LL, 10-11=LA, 12=Head)

#### Scenario: Left-arc attack uses left table

- **GIVEN** an attack resolved from the left arc
- **WHEN** hit location is rolled
- **THEN** the left-side 2d6 table SHALL be consulted (per TechManual p.109)

#### Scenario: Right-arc attack uses right table

- **GIVEN** an attack resolved from the right arc
- **WHEN** hit location is rolled
- **THEN** the right-side 2d6 table SHALL be consulted

#### Scenario: Rear-arc attack uses rear table

- **GIVEN** an attack resolved from the rear arc
- **WHEN** hit location is rolled
- **THEN** the rear 2d6 table SHALL be consulted
- **AND** hits SHALL apply to rear armor where applicable (CT rear, LT rear, RT rear)
