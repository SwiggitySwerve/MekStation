# Design: Record Sheet PDF Export

## Context

BattleTech tabletop gameplay requires printed record sheets showing unit stats, armor diagrams, weapons, and critical hit locations. MegaMekLab uses SVG templates with Apache Batik for PDF generation. For the web application, we use a client-side SVG-based solution that works offline and can eventually be used in an Electron desktop app.

## Goals / Non-Goals

**Goals:**
- Generate MegaMekLab-style record sheets usable for tabletop play
- Provide live preview in the customizer as users edit units
- Support PDF download and browser print
- Architecture extensible for other unit types (vehicles, aerospace, etc.)
- Use authentic MegaMek SVG templates for visual consistency

**Non-Goals:**
- Perfect pixel-for-pixel match with MegaMekLab output
- Server-side PDF generation
- Multi-unit batch printing (future enhancement)
- Reference charts/tables on record sheet (future enhancement)

## Decisions

### Decision: Use SVG Templates Only (Final Architecture)

**Rationale:** Using MegaMek's original SVG templates provides:
- Authentic MegaMekLab-style record sheets
- Pre-positioned elements requiring minimal calculation
- Consistent visual output across all platforms
- Easy maintenance - template updates from MegaMek apply automatically

**Architecture Evolution:**
- Initial: Canvas-based rendering with multiple renderer classes
- Final: Single SVG template renderer using MegaMek templates

**Removed Components:**
- ~~MechRecordSheetRenderer.ts~~ - Canvas renderer
- ~~ArmorDiagramRenderer.ts~~ - Canvas armor pips
- ~~EquipmentTableRenderer.ts~~ - Canvas equipment table
- ~~RecordSheetLayout.ts~~ - Layout constants

### Decision: Use jsPDF for PDF Generation

**Rationale:** jsPDF is a mature, well-maintained library with good browser support. It works entirely client-side, supports custom fonts, and can embed images. The SVG is rendered to a high-DPI canvas, then embedded as JPEG in the PDF.

### Decision: High-DPI Rendering

**Rationale:** Different DPI multipliers for different use cases:
- **Preview**: 20x multiplier for crisp display at any zoom level
- **PDF Export**: 20x multiplier for print-quality output

## Final Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      PreviewTab                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌────────────────────────────────┐│
│  │   PreviewToolbar    │  │    RecordSheetPreview          ││
│  │  [Download] [Print] │  │    (SVG→Canvas rendering)      ││
│  └─────────────────────┘  │                                ││
│                           │  ┌──────────────────────────┐  ││
│                           │  │  Floating Zoom Controls  │  ││
│                           │  │  [+] 85% [-]             │  ││
│                           │  │  [↔ Width] [↕ Height]    │  ││
│                           │  └──────────────────────────┘  ││
│                           └────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   RecordSheetService                         │
│  - extractData(unit) → IRecordSheetData                     │
│  - renderPreview(canvas, data) → Promise<void>              │
│  - exportPDF(data, options) → Promise<void>                 │
│  - getSVGString(data) → Promise<string>                     │
│  - print(canvas) → void                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 SVGRecordSheetRenderer                       │
├─────────────────────────────────────────────────────────────┤
│  - loadTemplate(path) → Promise<void>                       │
│  - fillTemplate(data) → void                                │
│  - fillArmorPips(armor) → Promise<void>                     │
│  - fillStructurePips(structure, tonnage) → Promise<void>    │
│  - renderToCanvas(canvas) → Promise<void>                   │
│  - renderToCanvasHighDPI(canvas, dpi) → Promise<void>       │
│  - getSVGString() → string                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   SVG Templates & Assets                     │
├─────────────────────────────────────────────────────────────┤
│  public/record-sheets/templates/                             │
│    └── mek_biped_default.svg                                │
│  public/record-sheets/biped_pips/                           │
│    ├── Armor_CT_1_Humanoid.svg ... Armor_*_*_Humanoid.svg   │
│    └── BipedIS20_CT.svg ... BipedIS100_*.svg                │
└─────────────────────────────────────────────────────────────┘
```

## SVG Template Element IDs

The SVG template contains pre-defined elements for data injection:

| Element ID | Content |
|------------|---------|
| `type` | Unit name (Chassis Model) |
| `tonnage` | Tonnage value |
| `techBase` | Tech base (Inner Sphere/Clan) |
| `rulesLevel` | Rules level |
| `mpWalk` | Walking MP |
| `mpRun` | Running MP |
| `mpJump` | Jumping MP |
| `bv` | Battle Value |
| `armorType` | Armor type name |
| `structureType` | Structure type name |
| `hsType` | Heat sink type |
| `hsCount` | Heat sink count |
| `textArmor_*` | Armor point values per location |
| `textIS_*` | Internal structure values per location |
| `crits_*` | Critical slot areas per location |
| `canonArmorPips` | Container for armor pip SVGs |
| `canonStructurePips` | Container for structure pip SVGs |
| `inventory` | Equipment table area |

## Zoom Controls

The preview includes floating controls positioned bottom-right:

| Button | Action |
|--------|--------|
| `+` | Zoom in 15% |
| `-` | Zoom out 15% |
| `↔` | Fit to container width |
| `↕` | Fit to container height |

Zoom range: 20% to 300%

## Risks / Trade-offs

- **Risk:** SVG template changes in MegaMek may require updates
  - **Mitigation:** Element IDs are stable; monitor MegaMek releases

- **Risk:** Large equipment lists may not fit in allocated space
  - **Mitigation:** Truncate names; future: auto-scale font size

- **Trade-off:** JPEG format in PDF vs PNG
  - Chose JPEG for better jsPDF compatibility; slight quality tradeoff acceptable

## Resolved Questions

- **Custom fonts:** Using Eurostile with web-safe fallbacks (Century Gothic, Trebuchet MS, Arial)
- **Multi-page support:** Deferred to future enhancement
- **Reference charts:** Deferred to future enhancement
