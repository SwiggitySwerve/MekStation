## MODIFIED Requirements

### Requirement: Auto-Allocation Algorithm

The system SHALL provide automatic armor distribution matching MegaMekLab's allocation pattern using a simplified three-phase approach.

#### Scenario: Phase 1 - Initial proportional spread

- **WHEN** calculating initial armor distribution
- **THEN** head SHALL receive min(floor(points × 0.25), 9)
- **AND** remaining body points SHALL be distributed proportionally to max capacity:
  - Each location = floor(bodyPoints × locationMax / totalBodyMax)
- **AND** paired locations (LT/RT, LA/RA, LL/RL) SHALL receive identical values

#### Scenario: Phase 2 - Symmetric remainder distribution

- **WHEN** distributing remaining points after initial spread
- **THEN** symmetric pairs SHALL be prioritized requiring 2 points each:
  1. Side Torsos (LT/RT +2)
  2. Legs (LL/RL +2)
  3. Arms (LA/RA +2)
- **AND** single locations SHALL receive odd remainders: 4. Center Torso (+1) 5. Head (+1)
- **AND** loop SHALL continue until all points allocated or all locations maxed

#### Scenario: Phase 3 - Torso front/rear split

- **WHEN** applying front/rear splits after body totals determined
- **THEN** CT rear SHALL be ceil(ctTotal / 4.5)
- **AND** CT front SHALL be ctTotal - ctRear
- **AND** side torso rear SHALL be:
  - 0 if sideTorsoTotal ≤ 40% of max
  - round(sideTorsoTotal × 0.25) if at max total armor
  - round(sideTorsoTotal × 0.22) otherwise
- **AND** side torso front SHALL be sideTorsoTotal - rear

#### Scenario: 32-point allocation (2 tons standard)

- **WHEN** auto-allocating 32 armor points on a 50-ton mech
- **THEN** allocation SHALL be:
  - Head: 8
  - Center Torso: 3 front, 1 rear
  - Left/Right Torso: 5 front each
  - Left/Right Arm: 2 each
  - Left/Right Leg: 3 each

#### Scenario: 152-point allocation (9.5 tons standard)

- **WHEN** auto-allocating 152 armor points on a 50-ton mech
- **THEN** allocation SHALL be:
  - Head: 9
  - Center Torso: 22 front, 7 rear
  - Left/Right Torso: 17 front, 5 rear each
  - Left/Right Arm: 14 each
  - Left/Right Leg: 21 each

#### Scenario: 160-point allocation (10 tons standard)

- **WHEN** auto-allocating 160 armor points on a 50-ton mech
- **THEN** allocation SHALL be:
  - Head: 9
  - Center Torso: 24 front, 7 rear
  - Left/Right Torso: 18 front, 5 rear each
  - Left/Right Arm: 15 each
  - Left/Right Leg: 22 each

#### Scenario: 168-point allocation (10.5 tons standard)

- **WHEN** auto-allocating 168 armor points on a 50-ton mech
- **THEN** allocation SHALL be:
  - Head: 9
  - Center Torso: 24 front, 7 rear
  - Left/Right Torso: 19 front, 5 rear each
  - Left/Right Arm: 16 each
  - Left/Right Leg: 24 each

#### Scenario: 169-point allocation (max armor, 50-ton)

- **WHEN** auto-allocating 169 armor points (max armor) on a 50-ton mech
- **THEN** allocation SHALL be:
  - Head: 9
  - Center Torso: 24 front, 8 rear
  - Left/Right Torso: 18 front, 6 rear each
  - Left/Right Arm: 16 each
  - Left/Right Leg: 24 each
- **AND** side torso rear SHALL use 25% ratio (not 22%) at max total armor

## REMOVED Requirements

### Requirement: Symmetry Enforcement

**Reason**: Merged into Auto-Allocation Algorithm Phase 2
**Migration**: Symmetry enforcement is now implicit in the symmetric remainder distribution loop

### Requirement: Torso Front/Rear Split

**Reason**: Merged into Auto-Allocation Algorithm Phase 3
**Migration**: Front/rear split logic is now Phase 3 of the unified algorithm
