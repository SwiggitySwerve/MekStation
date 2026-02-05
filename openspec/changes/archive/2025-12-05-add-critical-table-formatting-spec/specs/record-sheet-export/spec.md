## MODIFIED Requirements

### Requirement: Critical Slots Rendering

The system SHALL render critical hit tables for each location matching MegaMekLab style with precise positioning and typography.

**Rationale**: Critical slots track equipment placement and damage during gameplay. Exact visual match with MegaMekLab ensures consistent user experience.

**Priority**: High

**Status**: IMPLEMENTED ✓

#### Scenario: Critical slot display

- **WHEN** critical slots section renders
- **THEN** render into `crits_*` rect elements in template
- **AND** display location name label above the rect boundary
- **AND** show slot numbers 1-6 (restarting for 12-slot locations)

#### Scenario: Critical table title positioning

- **WHEN** location title renders
- **THEN** position title X at `rectX + rectWidth * 0.075` (7.5% indent from left edge)
- **AND** position title Y at `rectY - 4` pixels (above the rect boundary with clearance)
- **AND** use `text-anchor: start` (left-aligned)
- **AND** use Times New Roman serif font
- **AND** use bold font weight
- **AND** use font size of `baseFontSize * 1.25` (8.75px with 7px base)

#### Scenario: Critical slot font sizing

- **WHEN** critical slot entries render
- **THEN** use constant 7px font size for ALL locations regardless of slot count
- **AND** use Times New Roman serif font family
- **AND** this matches MegaMekLab's `DEFAULT_CRITICAL_SLOT_ENTRY_FONT_SIZE = 7f`

#### Scenario: Critical slot line height calculation

- **WHEN** slot entries are positioned vertically
- **THEN** calculate gap height as `rectHeight * 0.05` for 12-slot locations (0 for 6-slot)
- **AND** calculate line height as `(rectHeight - gapHeight) / slotCount`
- **AND** position slot Y as `rectY + (slotIndex + 0.7) * lineHeight`
- **AND** add gap offset for slots 7-12 in 12-slot locations

#### Scenario: Critical slot number positioning

- **WHEN** slot numbers render
- **THEN** position at `rectX + bracketWidth + bracketMargin + 2` pixels
- **AND** display as "1." through "6." (restarting after slot 6)
- **AND** use bold font weight for slot numbers

#### Scenario: Critical slot content positioning

- **WHEN** slot content text renders
- **THEN** position at `rectX + bracketWidth + bracketMargin + numberWidth` (approximately 11% from left)
- **AND** where numberWidth is 12px for the slot number column
- **AND** where bracketWidth is 2px for multi-slot indicator area
- **AND** where bracketMargin is 1px spacing

#### Scenario: Critical slot font styling

- **WHEN** critical slot text renders
- **THEN** use Times New Roman serif font (matching MegaMekLab)
- **AND** bold hittable equipment (weapons, system components)
- **AND** use normal weight for unhittable equipment (Endo Steel, Ferro-Fibrous, TSM)
- **AND** use normal weight black text for "Roll Again" entries
- **AND** use grey (#999999) for "-Empty-" entries

#### Scenario: Multi-slot equipment brackets

- **WHEN** equipment occupies multiple consecutive slots
- **THEN** draw L-shaped bracket on left side of slots
- **AND** bracket width is 3px (horizontal segments)
- **AND** bracket stroke width is 0.72px
- **AND** bracket vertical padding is `slotHeight * 0.15` from top and bottom edges (symmetrical)
- **AND** bracket only applies to user-added equipment, NOT system components
- **AND** bracket bridges continuously across slot 6/7 gap when equipment spans both sections
