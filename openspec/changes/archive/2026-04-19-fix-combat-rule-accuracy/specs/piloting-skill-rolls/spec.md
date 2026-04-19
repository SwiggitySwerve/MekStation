# piloting-skill-rolls (delta)

## ADDED Requirements

### Requirement: Pilot Consciousness Check

When a pilot takes sufficient damage to warrant a consciousness roll, the check SHALL use an inclusive `>=` comparison on the pilot-damage threshold, not the exclusive `>` previously used in `src/utils/gameplay/damage.ts` (~line 461).

This corrects a one-off where a pilot at the exact boundary damage value previously avoided the roll. Per TechManual p.87, the roll fires when damage reaches (not exceeds) the threshold.

#### Scenario: Pilot at threshold triggers consciousness roll

- **GIVEN** a pilot whose accumulated damage has just reached the consciousness threshold
- **WHEN** the consciousness check is evaluated
- **THEN** the check SHALL fire (pilot rolls 2d6 vs consciousness TN)

#### Scenario: Pilot below threshold does not trigger roll

- **GIVEN** a pilot whose accumulated damage is 1 point below the consciousness threshold
- **WHEN** the consciousness check is evaluated
- **THEN** the check SHALL NOT fire

#### Scenario: Pilot above threshold triggers roll

- **GIVEN** a pilot whose accumulated damage is 1 point above the consciousness threshold
- **WHEN** the consciousness check is evaluated
- **THEN** the check SHALL fire
