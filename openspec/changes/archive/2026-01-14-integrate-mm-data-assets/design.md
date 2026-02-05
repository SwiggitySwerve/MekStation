# Design: mm-data Asset Integration

## Architecture Overview

This design describes how MekStation will integrate with mm-data assets to achieve visual parity with MegaMekLab for armor diagrams and record sheet generation.

## Asset Structure in mm-data

```
mm-data/data/images/recordsheets/
├── biped_pips/                           # Pip SVGs for armor and internal structure
│   ├── Armor_{Location}_{Count}_Humanoid.svg    # Front armor pips (1-51 per location)
│   ├── Armor_{Location}_R_{Count}_Humanoid.svg  # Rear armor pips (torsos only)
│   └── BipedIS{Tonnage}_{Location}.svg          # Internal structure by tonnage
├── templates_us/                         # US Letter size templates
│   ├── mek_biped_default.svg
│   ├── mek_biped_toheat.svg              # Alternative with heat scale
│   ├── mek_quad_default.svg
│   ├── mek_tripod_default.svg
│   ├── mek_lam_default.svg
│   ├── mek_quadvee_default.svg
│   └── ... (vehicles, infantry, aerospace, etc.)
└── templates_iso/                        # ISO A4 size templates
    └── ... (same structure as US)
```

### Location Naming Convention

| MechLocation Enum | mm-data Code | Description            |
| ----------------- | ------------ | ---------------------- |
| HEAD              | HD           | Head                   |
| CENTER_TORSO      | CT           | Center Torso           |
| LEFT_TORSO        | LT           | Left Torso             |
| RIGHT_TORSO       | RT           | Right Torso            |
| LEFT_ARM          | LArm         | Left Arm               |
| RIGHT_ARM         | RArm         | Right Arm              |
| LEFT_LEG          | LLeg         | Left Leg               |
| RIGHT_LEG         | RLeg         | Right Leg              |
| FRONT_LEFT_LEG    | FLL          | Front Left Leg (Quad)  |
| FRONT_RIGHT_LEG   | FRL          | Front Right Leg (Quad) |
| REAR_LEFT_LEG     | RLL          | Rear Left Leg (Quad)   |
| REAR_RIGHT_LEG    | RRL          | Rear Right Leg (Quad)  |
| CENTER_LEG        | CL           | Center Leg (Tripod)    |

## Component Architecture

### 1. Asset Loader Service

New service to manage mm-data asset loading:

```typescript
// src/services/assets/MmDataAssetService.ts

interface MmDataAssetService {
  // Load armor pip SVG for a specific location and count
  getArmorPipSvg(
    location: MechLocation,
    count: number,
    isRear?: boolean,
  ): Promise<SVGElement>;

  // Load internal structure pip SVG for tonnage and location
  getStructurePipSvg(
    tonnage: number,
    location: MechLocation,
  ): Promise<SVGElement>;

  // Load record sheet template for configuration
  getRecordSheetTemplate(
    config: MechConfiguration,
    paperSize: PaperSize,
  ): Promise<SVGDocument>;

  // Preload assets for a specific configuration
  preloadConfiguration(
    config: MechConfiguration,
    tonnage: number,
  ): Promise<void>;
}
```

### 2. MegaMek Classic Armor Diagram

New armor diagram variant that uses mm-data assets:

```typescript
// src/components/customizer/armor/variants/MegaMekClassicDiagram.tsx

interface MegaMekClassicDiagramProps {
  armorData: LocationArmorData[];
  selectedLocation: MechLocation | null;
  onLocationClick: (location: MechLocation) => void;
  configuration: MechConfiguration;
}

// Rendering approach:
// 1. Load base silhouette from mm-data or use simplified outline
// 2. For each location, load appropriate armor pip SVG based on current armor value
// 3. Overlay invisible click targets for interaction
// 4. Apply selection/hover styles to click targets
```

### 3. Updated Record Sheet Service

Extend RecordSheetService to handle all configurations:

```typescript
// src/services/printing/RecordSheetService.ts

// Template selection based on configuration
function getTemplatePath(
  config: MechConfiguration,
  paperSize: PaperSize,
): string {
  const sizeDir = paperSize === PaperSize.A4 ? 'templates_iso' : 'templates_us';
  const configMap: Record<MechConfiguration, string> = {
    [MechConfiguration.BIPED]: 'mek_biped_default.svg',
    [MechConfiguration.QUAD]: 'mek_quad_default.svg',
    [MechConfiguration.TRIPOD]: 'mek_tripod_default.svg',
    [MechConfiguration.LAM]: 'mek_lam_default.svg',
    [MechConfiguration.QUADVEE]: 'mek_quadvee_default.svg',
  };
  return `/record-sheets/${sizeDir}/${configMap[config]}`;
}
```

## Asset Sync Strategy

### Development Mode

During development, mm-data is expected to be a sibling repository:

```
Projects/
├── MekStation/
└── mm-data/
```

A sync script copies required assets:

```bash
# scripts/sync-mm-data-assets.sh
#!/bin/bash
SOURCE="../mm-data/data/images/recordsheets"
DEST="public/record-sheets"

# Sync all templates
cp -r "$SOURCE/templates_us" "$DEST/"
cp -r "$SOURCE/templates_iso" "$DEST/"

# Sync biped pips (already partial)
cp -r "$SOURCE/biped_pips" "$DEST/"

# Sync quad, tripod, LAM pips if they exist
# (may need to create similar structure for non-biped)
```

### Production Build

For production builds where mm-data may not be present:

1. Assets are checked into MekStation's public folder
2. CI/CD pipeline can sync from mm-data before build
3. Version tracking via `mm-data-version.json` manifest

## Interactive Overlay System

Since mm-data pip SVGs are static (just circles), we need to add interactivity:

```tsx
// Layered approach
<svg className="armor-diagram">
  {/* Layer 1: Background silhouette */}
  <image href={silhouettePath} />

  {/* Layer 2: Armor pips from mm-data (visual only) */}
  <g className="armor-pips">
    {locations.map((loc) => (
      <MmDataArmorPips key={loc} location={loc} count={armorData[loc]} />
    ))}
  </g>

  {/* Layer 3: Invisible click targets with hover effects */}
  <g className="click-targets">
    {locations.map((loc) => (
      <ClickTarget
        key={loc}
        location={loc}
        bounds={locationBounds[loc]}
        isSelected={selectedLocation === loc}
        onClick={() => onLocationClick(loc)}
      />
    ))}
  </g>
</svg>
```

## Location Bounds Mapping

Each configuration needs a mapping of location bounds for click targets:

```typescript
// src/components/customizer/armor/shared/LocationBounds.ts

interface LocationBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  path?: string; // For non-rectangular regions
}

// Extracted from mm-data template analysis
const BIPED_LOCATION_BOUNDS: Record<MechLocation, LocationBounds> = {
  [MechLocation.HEAD]: { x: 285, y: 90, width: 42, height: 35 },
  [MechLocation.CENTER_TORSO]: { x: 270, y: 130, width: 72, height: 90 },
  // ... etc
};
```

## Performance Considerations

1. **SVG Caching**: Load and parse each pip SVG once, cache the DOM element
2. **Preloading**: When user opens armor tab, preload all pip variants for current tonnage
3. **Lazy Loading**: Only load templates when navigating to Preview tab
4. **Bundle Size**: SVG files are text-based, compress well with gzip

## Migration Path

### Phase 1: Add MegaMek Classic Variant

- Keep all 5 existing variants functional
- Add "MegaMek Classic" as 6th variant option
- Set as new default in Settings

### Phase 2: Complete Template Coverage

- Add all configuration templates to public folder
- Update RecordSheetService to handle each
- Test PDF export for all configurations

### Phase 3: Optional Cleanup

- After user validation, consider deprecating less-used variants
- Or keep all variants for user preference
