# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Combat Projection Explanation Details

The tactical map interface SHALL include rules-backed combat details in the shared per-hex tactical projection explanation.

**Priority**: High

#### Scenario: Projection explanation summarizes attack constraints

**GIVEN** a hex projection contains combat data
**WHEN** the projection explanation is exposed through map metadata or projection badge text
**THEN** the explanation SHALL include range, distance, line of sight, and firing arc
**AND** it SHALL identify available weapons when any are available
**AND** it SHALL identify target visibility and target unit ids when targets are present

#### Scenario: Projection explanation summarizes attack modifiers

**GIVEN** a hex projection contains combat cover, minimum-range, to-hit, or indirect-fire details
**WHEN** the projection explanation is exposed
**THEN** the explanation SHALL include those modifier details without recalculating combat legality in the map renderer

#### Scenario: Movement and terrain explanation remains present

**GIVEN** a hex projection contains terrain and movement data
**WHEN** combat explanation details are added
**THEN** existing terrain, elevation, movement MP, and blocked-reason explanation content SHALL remain present
