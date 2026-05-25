# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Movement Projection Explanation Details

The tactical map interface SHALL include rules-backed movement details in the
shared per-hex tactical projection explanation.

**Priority**: High

#### Scenario: Projection explanation summarizes movement costs

**GIVEN** a hex projection contains movement data
**WHEN** the projection explanation is exposed through map metadata or projection badge text
**THEN** the explanation SHALL include movement type, reachability, and total MP cost
**AND** it SHALL include movement mode, terrain cost, elevation delta/cost, heat generated, and path length when those values are present

#### Scenario: Projection explanation summarizes stand-up requirements

**GIVEN** a hex projection contains stand-up movement data
**WHEN** the projection explanation is exposed
**THEN** the explanation SHALL include stand-up cost, stand-up PSR target, impossible reason, and modifier details when those values are present

#### Scenario: Rendered impossible stand-up explains destination block

**GIVEN** a movement projection contains an impossible stand-up reason
**WHEN** the projected destination is rendered in the tactical map
**THEN** the destination hex SHALL expose non-reachable movement metadata with invalid reason and details
**AND** the hex SHALL expose stand-up required, stand-up cost, and impossible-reason metadata
**AND** visible stand-up and invalid badges SHALL identify the stand-up block without relying on color alone
**AND** the tactical hover explanation SHALL show the impossible stand-up reason

#### Scenario: Combat and terrain explanation remains present

**GIVEN** a hex projection contains terrain, movement, combat, or blocked-reason data
**WHEN** movement explanation details are added
**THEN** existing terrain, elevation, combat, and blocked-reason explanation content SHALL remain present
