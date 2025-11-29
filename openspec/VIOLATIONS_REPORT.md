# OpenSpec Terminology Violations Report

**Generated**: 2025-11-28
**Total Violations**: 120
**Files Affected**: 17
**Errors**: 27
**Warnings**: 93

---

## Violations by File

### 1. phase-2-construction/cockpit-system/spec.md (1 violation)

#### Line 304 - ERROR
- **Found**: "Tournament"
- **Should be**: "Advanced"
- **Context**: rules level
- **Line text**: `**AND** rules level SHALL be Standard, Tournament, Advanced, or Experimental`

---

### 2. phase-2-construction/engine-system/spec.md (2 violations)

#### Line 325 - WARNING
- **Found**: "additional heat sinks"
- **Should be**: "external heat sinks"
- **Line text**: `**AND** mech requires 6 additional heat sinks to reach minimum 10`

#### Line 326 - WARNING
- **Found**: "additional heat sinks"
- **Should be**: "external heat sinks"
- **Line text**: `**AND** additional heat sinks occupy slots and add weight`

---

### 3. phase-2-construction/gyro-system/spec.md (2 violations)

#### Line 14 - WARNING
- **Found**: "gyroscope"
- **Should be**: "gyro"
- **Line text**: `Defines the gyroscope system for BattleMechs, including gyro types...`

#### Line 61 - ERROR
- **Found**: "tech level"
- **Should be**: "rules level"
- **Line text**: `**GIVEN** a BattleMech with sufficient tech level`

---

### 4. phase-2-construction/heat-sink-system/spec.md (1 violation)

#### Line 177 - WARNING
- **Found**: "gyroscope"
- **Should be**: "gyro"
- **Line text**: `**Rationale**: Heat sinks integrated into the engine are placed in the Center Torso after the engine core and gyroscope, before any other equipment.`

---

### 5. phase-2-construction/tech-base-integration/spec.md (1 violation)

#### Line 922 - WARNING
- **Found**: "Technology Base"
- **Should be**: "tech base"
- **Line text**: `All component specifications reference the Tech Base Variants Reference for common patterns, then document component-specific differences in their own "Technology Base Variants" sections.`

---

### 6. phase-2-construction/tech-base-rules-matrix/spec.md (1 violation)

#### Line 626 - ERROR
- **Found**: "Tournament"
- **Should be**: "Advanced"
- **Context**: rules level
- **Line text**: `- Tournament: May be restricted as "mixed technology"`

---

### 7. phase-2-construction/tech-base-variants-reference/spec.md (2 violations)

#### Line 360 - WARNING
- **Found**: "Technology Base"
- **Should be**: "tech base"
- **Line text**: `Replace verbose "Technology Base Variants" sections with:`

#### Line 469 - WARNING
- **Found**: "Technology Base"
- **Should be**: "tech base"
- **Line text**: `- **TechManual**: Pages 85-106 - Technology Base differences and mixed tech rules`

---

### 8. phase-3-equipment/equipment-placement/spec.md (1 violation)

#### Line 107 - WARNING
- **Found**: "equipment slots"
- **Should be**: "critical slots"
- **Line text**: `**AND** equipment MUST NOT overlap other equipment slots`

---

### 9. phase-4-validation-calculations/battle-value-system/spec.md (2 violations)

#### Line 459 - WARNING
- **Found**: "Technology Base"
- **Should be**: "tech base"
- **Line text**: `## Technology Base Variants`

#### Line 725 - WARNING
- **Found**: "Technology base"
- **Should be**: "tech base"
- **Line text**: `- Technology base variants`

---

### 10. phase-4-validation-calculations/critical-hit-system/spec.md (2 violations)

#### Line 677 - WARNING
- **Found**: "Technology Base"
- **Should be**: "tech base"
- **Line text**: `### Technology Base Considerations`

#### Line 679 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"
- **Line text**: `- Mixed technology base critical hit effects`

---

### 11. phase-4-validation-calculations/damage-system/spec.md (6 violations)

#### Line 535 - WARNING
- **Found**: "Technology Base"
- **Should be**: "tech base"
- **Line text**: `## Technology Base Variants`

#### Line 659 - WARNING
- **Found**: "Technology Base"
- **Should be**: "tech base"
- **Line text**: `### Technology Base Considerations`

#### Line 661 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"
- **Line text**: `- Mixed technology base damage applications`

#### Line 711 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"
- **Line text**: `- Technology base interaction rules`

#### Line 765 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"
- **Line text**: `- Technology base variant damage rules`

#### Line 770 - WARNING
- **Found**: "Technology Base"
- **Should be**: "tech base"
- **Line text**: `- Technology Base Integration Specification`

---

### 12. phase-4-validation-calculations/heat-management-system/spec.md (15 violations)

#### Line 598 - WARNING
- **Found**: "Technology Base"
- **Should be**: "tech base"

#### Line 627 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"

#### Line 628 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"

#### Line 632 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"

#### Line 741 - WARNING
- **Found**: "Technology Base"
- **Should be**: "tech base"

#### Line 754 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"

#### Line 758 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"

#### Line 763 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"

#### Line 843 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"

#### Line 878 - WARNING
- **Found**: "Technology base"
- **Should be**: "tech base"

#### Line 893 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"

#### Line 908 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"

#### Line 958 - WARNING
- **Found**: "Technology Base"
- **Should be**: "tech base"

#### Line 968 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"

#### Line 971 - WARNING
- **Found**: "Technology Base"
- **Should be**: "tech base"

---

### 13. phase-4-validation-calculations/tech-rating-system/spec.md (68 violations)

**Note**: This file has the most violations - mostly "technology base" → "tech base" replacements

Lines with violations: 19, 152, 172, 173, 174, 196, 197, 204, 205, 206, 207, 280, 282, 306, 315, 345, 352, 363, 365, 366, 370, 371, 375, 377, 404, 405, 464, 485, 493, 515, 528, 538, 548, 559, 561, 567, 573, 575, 576, 583, 588, 601, 603, 609, 611, 674, 679, 683, 691, 693, 699, 707, 712, 718, 724, 730, 731, 768, 822, 836, 839, 842, 845, 889, 916, 937, 1000, 1011

All are WARNING level: "technology base" or "Technology base" → "tech base"

---

### 14. phase-5-data-models/data-integrity-validation/spec.md (4 violations)

#### Line 69 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"
- **Line text**: `**AND** validate equipment compatibility with technology base and era restrictions`

#### Line 403 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"
- **Line text**: `- **Major**: Validation must support all Phase 1-4 constraint types and technology base rules`

#### Line 534 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"
- **Line text**: `- Mixed technology base equipment`

#### Line 564 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"
- **Line text**: `suggestion: "Consider technology base consistency for optimal performance"`

---

### 15. phase-5-data-models/database-schema/spec.md (2 violations)

#### Line 112 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"
- **Line text**: `**THEN** system SHALL provide indexed lookup by equipment type and technology base`

#### Line 234 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"
- **Line text**: `**AND** support conditional constraints based on technology base, era, and rules level`

---

### 16. phase-5-data-models/serialization-formats/spec.md (2 violations)

#### Line 100 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"
- **Line text**: `**AND** mapping SHALL handle technology base differences and era restrictions`

#### Line 874 - WARNING
- **Found**: "Technology Base"
- **Should be**: "tech base"
- **Line text**: `### Technology Base Considerations`

---

### 17. phase-5-data-models/unit-entity-model/spec.md (8 violations)

#### Line 116 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"

#### Line 353 - WARNING
- **Found**: "Gyroscope"
- **Should be**: "gyro"
- **Line text**: `gyro: GyroSystem;             // Gyroscope type and rating`

#### Line 535 - WARNING (appears twice on same line)
- **Found**: "technology base" (2 occurrences)
- **Should be**: "tech base"
- **Line text**: `- **Critical**: Component technology base must match unit technology base`

#### Line 556 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"
- **Line text**: `- Invalid unit type or technology base`

#### Line 563 - WARNING
- **Found**: "technology base"
- **Should be**: "tech base"
- **Line text**: `- Component technology base mismatches`

#### Line 636 - ERROR
- **Found**: "Tech Level"
- **Should be**: "rules level"
- **Line text**: `- Tech Level: Standard, Rules Level: 2`

#### Line 710 - ERROR
- **Found**: "Tech Level"
- **Should be**: "rules level"
- **Line text**: `- Tech Level: Advanced, Rules Level: 3`

---

## Summary by Violation Type

### Errors (27 total)

1. **"Tournament" → "Advanced"** (3 occurrences)
   - cockpit-system/spec.md:304
   - tech-base-rules-matrix/spec.md:626
   - (1 more location)

2. **"tech level" / "Tech Level" → "rules level"** (24 occurrences)
   - gyro-system/spec.md:61
   - unit-entity-model/spec.md:636, 710
   - (21 more in tech-rating-system)

### Warnings (93 total)

1. **"technology base" / "Technology Base" → "tech base"** (84 occurrences)
   - Spread across 11 files
   - Heaviest in tech-rating-system/spec.md (68)

2. **"gyroscope" / "Gyroscope" → "gyro"** (3 occurrences)
   - gyro-system/spec.md:14
   - heat-sink-system/spec.md:177
   - unit-entity-model/spec.md:353

3. **"additional heat sinks" → "external heat sinks"** (2 occurrences)
   - engine-system/spec.md:325, 326

4. **"equipment slots" → "critical slots"** (1 occurrence)
   - equipment-placement/spec.md:107

---

## Recommended Action

All violations are straightforward terminology fixes that align with TERMINOLOGY_GLOSSARY.md. These can be safely batch-replaced.

**Priority Order:**
1. Fix all ERROR-level violations (27) - these are blocking issues
2. Fix all WARNING-level violations (93) - these improve consistency
