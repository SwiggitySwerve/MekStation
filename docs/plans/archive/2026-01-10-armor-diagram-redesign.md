# Armor Diagram Redesign - Design Specification

## Overview

Complete visual overhaul of the armor diagram in the customizer's Armor Tab. The current implementation uses simple rectangles with numbers. The redesign will create 4 distinct prototypes for user acceptance testing (UAT), allowing stakeholders to pick the best approach or combine elements from different designs.

## Current State

**Location:** `src/components/customizer/armor/`
- `ArmorDiagram.tsx` - Main SVG container (300x400 viewBox)
- `ArmorLocation.tsx` - Individual clickable location (rect + text)
- `ArmorLegend.tsx` - Color legend

**Current Issues:**
- Simple rectangles don't look like a BattleMech
- Hard to quickly assess armor allocation status
- Visual style doesn't match modern app aesthetic
- Front/rear armor display feels cramped

## Design Matrix

The redesign explores these independent properties:

### A. Silhouette Shape
| ID | Name | Description |
|----|------|-------------|
| A1 | Realistic Contour | Smooth SVG paths forming actual mech shape |
| A2 | Geometric/Polygonal | Angular low-poly shapes suggesting mech form |
| A3 | Simplified Iconic | Basic shapes with better proportions |
| A4 | Wireframe Outline | Thin line drawing with floating panels |

### B. Fill Style
| ID | Name | Description |
|----|------|-------------|
| B1 | Solid Gradient | Status color gradient (green to red) |
| B2 | Bottom-Up Tank | Fill rises from bottom based on % full |
| B3 | Metallic/Textured | Brushed metal or carbon fiber texture |
| B4 | Glow/Neon | Semi-transparent fill with glowing edges |

### C. Number Display
| ID | Name | Description |
|----|------|-------------|
| C1 | Plain Bold | Large centered number, clean font |
| C2 | LED Segmented | Digital clock-style segmented display |
| C3 | Circular Badge | Number inside hexagon or circle |
| C4 | With Progress Ring | Number surrounded by circular progress arc |

### D. Capacity Indicator
| ID | Name | Description |
|----|------|-------------|
| D1 | Color Only | Location color shifts green/amber/red |
| D2 | Horizontal Bar | Small gauge bar under the number |
| D3 | Small Text | "24/32" or "75%" shown |
| D4 | Dot Indicators | 3-5 dots like battery level |

### E. Front/Rear Display
| ID | Name | Description |
|----|------|-------------|
| E1 | Stacked | Front/rear as top/bottom sections |
| E2 | Side-by-Side | Front mech left, rear mech right |
| E3 | Toggle Switch | Button to flip between views |
| E4 | Slide-out Panel | Click to reveal rear in side panel |
| E5 | 3D Layered | Rear plate visually behind front plate |

### F. Interaction Style
| ID | Name | Description |
|----|------|-------------|
| F1 | Glow Pulse | Edges glow brighter, pulse on select |
| F2 | Lift/Shadow | Location raises with drop shadow |
| F3 | Bracket Focus | Corner brackets and targeting reticle |
| F4 | Border Highlight | Simple thick colored border |

---

## 4 Prototype Combinations

### Combo 1: "Clean Tech"
**Philosophy:** Maximum readability and usability

| Property | Selection |
|----------|-----------|
| Silhouette | A1: Realistic Contour |
| Fill | B1: Solid Gradient |
| Numbers | C1: Plain Bold |
| Capacity | D1: Color Only + D3: Small Text |
| Front/Rear | E1: Stacked |
| Interaction | F4: Border Highlight |

**Target Users:** Players who prioritize function over form, quick builders

### Combo 2: "Neon Operator"
**Philosophy:** Sci-fi aesthetic and visual impact

| Property | Selection |
|----------|-----------|
| Silhouette | A4: Wireframe Outline |
| Fill | B4: Glow/Neon |
| Numbers | C4: With Progress Ring |
| Capacity | D1: Color Only |
| Front/Rear | E3: Toggle Switch |
| Interaction | F1: Glow Pulse |

**Target Users:** Players who want immersive cockpit experience

### Combo 3: "Tactical HUD"
**Philosophy:** Information density and military feel

| Property | Selection |
|----------|-----------|
| Silhouette | A2: Geometric/Polygonal |
| Fill | B2: Bottom-Up Tank |
| Numbers | C2: LED Segmented |
| Capacity | D2: Horizontal Bar |
| Front/Rear | E2: Side-by-Side |
| Interaction | F3: Bracket Focus |

**Target Users:** Detail-oriented players, competitive builders

### Combo 4: "Premium Material"
**Philosophy:** Modern app polish and tactile feel

| Property | Selection |
|----------|-----------|
| Silhouette | A1: Realistic Contour |
| Fill | B3: Metallic/Textured |
| Numbers | C3: Circular Badge |
| Capacity | D4: Dot Indicators |
| Front/Rear | E5: 3D Layered |
| Interaction | F2: Lift/Shadow |

**Target Users:** Design-conscious players, those who appreciate polish

---

## Implementation Plan

### File Structure
```
src/components/customizer/armor/
├── ArmorDiagram.tsx          # Existing - will add variant support
├── ArmorLocation.tsx         # Existing - will add variant support
├── ArmorLegend.tsx           # Existing
├── ArmorDiagramSelector.tsx  # NEW - UAT design picker
├── variants/
│   ├── CleanTechDiagram.tsx
│   ├── NeonOperatorDiagram.tsx
│   ├── TacticalHUDDiagram.tsx
│   └── PremiumMaterialDiagram.tsx
└── shared/
    ├── MechSilhouette.tsx    # SVG path definitions
    ├── ArmorFills.tsx        # Fill patterns/gradients
    └── InteractionStyles.tsx # Hover/select effects
```

### Shared Components

**MechSilhouette.tsx:**
- Export SVG path data for realistic and geometric silhouettes
- Provide position coordinates for each location
- Support both biped and (future) quad layouts

**ArmorFills.tsx:**
- SVG gradient definitions
- Filter definitions for glow/metallic effects
- Reusable fill patterns

### UAT Design Selector

For testing, create a selector component that:
1. Shows all 4 designs in a grid
2. Allows switching between them in the actual ArmorTab
3. Persists selection to localStorage for continued testing
4. Can be removed after final design is chosen

---

## Color Palette

All designs share these status colors:

| Status | Hex | Usage |
|--------|-----|-------|
| Healthy (100-75%) | `#22c55e` (green-500) | Full or near-full armor |
| Moderate (74-50%) | `#f59e0b` (amber-500) | Partially allocated |
| Low (49-25%) | `#f97316` (orange-500) | Getting thin |
| Critical (<25%) | `#ef4444` (red-500) | Dangerously low |
| Selected | `#3b82f6` (blue-500) | Active selection |
| Hover | Lightened version | Mouse over |

---

## Accessibility Requirements

All designs must maintain:
- `role="button"` on clickable locations
- `aria-label` with full armor details
- `aria-pressed` for selected state
- Keyboard navigation (Tab, Enter, Space)
- Focus visible indicators
- Color contrast ratios meeting WCAG AA

---

## Success Criteria

After UAT testing, the winning design must:
1. Be clearly preferred by majority of testers
2. Show armor allocation at a glance
3. Make front/rear armor intuitive
4. Feel consistent with MekStation's visual language
5. Perform well (no jank on mobile devices)
