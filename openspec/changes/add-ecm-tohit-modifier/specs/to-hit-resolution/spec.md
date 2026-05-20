# Spec Delta: To-Hit Resolution

## ADDED Requirements

### Requirement: ECM To-Hit Modifier

The to-hit calculator SHALL apply a `+1 to-hit` modifier when a weapon attack's guidance system is degraded by an active ECM bubble. The four guidance types covered are C3-linked weapons (link broken), Artemis-IV-guided LRM/SRM (lock degraded), targeting-computer-assisted weapons (TC degraded), and NARC-linked weapons (homing degraded). The modifier is positional — it depends on whether the shooter, target, or both are inside an `EcmCoverageMap` bubble for the relevant guidance type.

**Priority**: High

#### Scenario: C3-linked weapon firing with shooter inside an ECM bubble

**GIVEN** a unit equipped with a C3-linked PPC inside an ECM bubble
**AND** a target outside the bubble
**WHEN** the to-hit calculator resolves the attack
**THEN** the calculator SHALL add a `+1` modifier with `reason: 'c3-broken'`
**AND** the modifier SHALL stack additively with existing range / movement / terrain / heat modifiers

#### Scenario: Artemis-IV-guided LRM firing at target inside an ECM bubble

**GIVEN** a unit equipped with Artemis-IV-LRM-15 firing at a target inside an ECM bubble
**AND** the shooter is outside the bubble
**WHEN** the to-hit calculator resolves the attack
**THEN** the calculator SHALL add a `+1` modifier with `reason: 'artemis-degraded'`

#### Scenario: TC-assisted weapon firing with shooter inside an ECM bubble

**GIVEN** a unit equipped with a TC-assisted ER large laser inside an ECM bubble
**AND** firing at any target (inside or outside the bubble)
**WHEN** the to-hit calculator resolves the attack
**THEN** the calculator SHALL add a `+1` modifier with `reason: 'tc-degraded'`

#### Scenario: NARC-linked weapon firing at NARCd target inside an ECM bubble

**GIVEN** a unit firing a NARC-linked SRM at a target carrying a NARC beacon
**AND** the target is inside an ECM bubble
**WHEN** the to-hit calculator resolves the attack
**THEN** the calculator SHALL add a `+1` modifier with `reason: 'narc-degraded'`

#### Scenario: Non-electronic weapon fires unaffected by ECM

**GIVEN** a unit firing a standard medium laser (no electronic guidance)
**AND** the shooter and/or target is inside an ECM bubble
**WHEN** the to-hit calculator resolves the attack
**THEN** the calculator SHALL NOT add any ECM modifier
**AND** the to-hit roll SHALL be unchanged from the previous (pre-fix) behavior

#### Scenario: Modifier appears in the post-resolve breakdown

**GIVEN** an attack to which the ECM modifier was applied
**WHEN** the result is rendered in the after-combat report
**THEN** the modifier SHALL appear as a line item with the `reason` label, so the operator can see why the to-hit was elevated
