## MODIFIED Requirements

### Requirement: Walk/Run MP Calculation

Movement points SHALL be calculated from engine rating and tonnage.

#### Scenario: Walk MP

- **WHEN** calculating walk MP
- **THEN** walkMP = floor(engineRating / tonnage)
- **AND** minimum walk MP = 1

#### Scenario: Run MP

- **WHEN** calculating base run MP without movement enhancements, damage or heat
- **THEN** runMP SHALL be walkMP × 1.5 rounded upward
- **AND** walk MP 5 SHALL give run MP 8, and walk MP 3 SHALL give run MP 5
- **AND** the construction calculation service SHALL pass that run MP to BattleMech Battle Value

Source: MegaMek revision `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
[`Entity.java:4004-4016`](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Entity.java#L4004)
(`getOriginalRunMP` and `getRunMP` use `ceil(walk × 1.5)`). MASC, supercharger, TSM,
hardened armor and shields change run MP through separate rules (`Mek.java:1748-1761`)
that this requirement does not define.
