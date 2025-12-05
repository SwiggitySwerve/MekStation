# Change: Add Record Sheet PDF Export with Preview Tab

## Why

Users need to generate printable record sheets for tabletop play. This is a core feature of MegaMekLab that must be replicated for the web application to be functionally complete. Record sheets are essential for playing BattleTech tabletop games, containing all unit information needed during gameplay.

## What Changes

- **NEW**: `record-sheet-export` capability - PDF generation and preview functionality
- **MODIFIED**: `customizer-tabs` - Add Preview tab (7th tab alongside existing 6)
- Add jsPDF dependency for client-side PDF generation
- Create printing services layer for SVG-based record sheet rendering
- Create PreviewTab component with live preview and export buttons

## Impact

- Affected specs: `record-sheet-export` (new), `customizer-tabs` (modified)
- Affected code:
  - `src/types/printing/` - Type definitions
  - `src/services/printing/` - SVG-based PDF generation services
  - `src/components/customizer/tabs/PreviewTab.tsx` - Tab component
  - `src/components/customizer/preview/` - Preview rendering components
  - `src/components/customizer/tabs/CustomizerTabs.tsx` - Add Preview tab
  - `package.json` - jsPDF dependency

---

## Technical Implementation Details

### SVG Template-Only Architecture

The record sheet renderer uses **only** MegaMek's original SVG templates. Legacy canvas-based renderers have been removed in favor of a single unified SVG approach:

**Final Architecture:**
- `SVGRecordSheetRenderer.ts` - Loads and populates SVG templates
- `RecordSheetService.ts` - Orchestrates data extraction and rendering

**Removed (legacy canvas approach):**
- ~~MechRecordSheetRenderer.ts~~
- ~~ArmorDiagramRenderer.ts~~
- ~~EquipmentTableRenderer.ts~~
- ~~RecordSheetLayout.ts~~

### SVG Template Integration

Templates from `mm-data/data/images/recordsheets/templates_us/` contain:
- Pre-defined text element IDs for data fields (e.g., `type`, `tonnage`, `mpWalk`)
- Positioned groups for armor/structure pips with specific transforms
- Critical slot areas (`crits_HD`, `crits_CT`, etc.)

### Armor Pip Rendering (Critical Implementation Detail)

**Problem**: MegaMek pip SVG files (e.g., `Armor_CT_5_Humanoid.svg`) contain path elements with coordinates designed for a 612×792 viewBox, but paths must be positioned correctly within the armor diagram silhouettes.

**Solution**: MegaMek uses a `canonArmorPips` element in the template with a specific matrix transform that handles ALL coordinate translation and scaling.

#### How MegaMekLab Does It (Java)

1. Template contains: `<g id="canonArmorPips" transform="matrix(0.975,0,0,0.975,-390.621,-44.241)" />`
2. Pip paths are loaded from individual SVG files (e.g., `Armor_LArm_8_Humanoid.svg`)
3. Paths are imported **directly** into the `canonArmorPips` group **without any additional transforms**
4. The parent's matrix transform handles all positioning

#### Web Implementation (TypeScript)

```typescript
// 1. Find the canonArmorPips group (has positioning transform)
let armorPipsGroup = this.svgDoc.getElementById('canonArmorPips');
if (!armorPipsGroup) {
  armorPipsGroup = this.svgDoc.getElementById('armorPips'); // fallback
}

// 2. Import pip paths directly - NO transform on location groups
const locationGroup = this.svgDoc.createElementNS(SVG_NS, 'g');
locationGroup.setAttribute('id', `pips_${locationName}`);
locationGroup.setAttribute('class', 'armor-pips');
// NO transform attribute - parent handles positioning

// 3. Clone paths from pip file into location group
paths.forEach(path => {
  const clonedPath = this.svgDoc.importNode(path, true);
  locationGroup.appendChild(clonedPath);
});

armorPipsGroup.appendChild(locationGroup);
```

#### Key Insight

**DO NOT** apply scaling transforms to individual pip groups. The `canonArmorPips` parent element's `matrix(0.975,0,0,0.975,-390.621,-44.241)` transform:
- Scales coordinates by 0.975 (converting from 612×792 space)
- Translates by (-390.621, -44.241) to position within the armor diagram

This approach ensures pixel-perfect alignment with MegaMekLab's output.

### Asset Dependencies

Required assets copied from `mm-data`:
- `public/record-sheets/templates/mek_biped_default.svg` - Main template
- `public/record-sheets/biped_pips/` - All pip SVG files (Armor_*.svg, BipedIS*.svg)

### Preview UI Features

The preview component includes floating zoom controls:
- **Zoom In/Out** - 15% increments, range 20%-300%
- **Fit to Width** - Auto-scale to container width
- **Fit to Height** - Auto-scale to container height
- **Zoom Level Display** - Shows current percentage

## Status: COMPLETE

All requirements implemented and tested. Ready for archive.
