# Armor Editor UX Redesign

**Date:** 2026-01-10
**Status:** Approved
**Author:** Claude + User

## Problem Statement

The current armor customization UI has two issues:

1. **LocationArmorEditor UX** - Uses a confusing "total slider + split slider" approach that requires mental math to understand
2. **Diagram inconsistency** - NeonOperator variant uses a toggle to switch between front/rear views, hiding one at a time. Other variants show both but use different layouts.

## Design Goals

- Simple, direct controls for front and rear armor
- All diagram variants show front and rear simultaneously
- Consistent stacked layout across all variants
- Consistent color coding (amber = front, sky blue = rear)

---

## LocationArmorEditor Redesign

### Current State

```
Total:  ──●━━━━━━━━━━━━━━━━━━━━  [47]
Split:  ████████████░░░░░░░░░░░  (drag to adjust ratio)
Front:  [35]    Rear: [12]
```

Problems:
- Two sliders is confusing
- Split slider only works after setting total
- Mental model unclear

### New Design

```
┌─────────────────────────────────────────┐
│  CENTER TORSO                        ✕  │
├─────────────────────────────────────────┤
│                                         │
│  FRONT                                  │
│  ──●━━━━━━━━━━━━━━━━━━━━━━━──  [35] /47 │
│  (amber slider)                         │
│                                         │
│  REAR                                   │
│  ━━━━━━━●────────────────────  [12] /47 │
│  (sky blue slider)                      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ████████████████░░░░░░░░░░░░░░░ │    │
│  │ 47 / 94 total                   │    │
│  └─────────────────────────────────┘    │
│  (combined bar - read only)             │
│                                         │
└─────────────────────────────────────────┘
```

### Behavior

- **Front slider**: Independent, capped at `maxArmor - rearValue`
- **Rear slider**: Independent, capped at `maxArmor - frontValue`
- **Number inputs**: Allow precise entry with same capping rules
- **Total bar**: Read-only display showing combined value vs location max
- **Colors**: Front = amber (#f59e0b), Rear = sky blue (#0ea5e9)

---

## Diagram Variants - Standardized Stacked Layout

All 4 variants will use a consistent stacked front/rear layout for torso locations (CT, LT, RT), adapted to each variant's visual style.

### CleanTech (solid gradients)

```
┌─────────────┐
│     CT      │
│  ┌───────┐  │
│  │  35   │  │  ← front section (amber gradient fill)
│  │ ───── │  │  ← subtle divider
│  │  12   │  │  ← rear section (sky gradient fill)
│  └───────┘  │
└─────────────┘
```

### NeonOperator (glowing rings)

```
┌─────────────┐
│     CT      │
│    ◎35     │  ← front progress ring (amber glow)
│   ─ ─ ─    │  ← glowing dashed divider
│    ○12     │  ← rear progress ring (sky glow)
└─────────────┘
```

**Note:** Remove existing FRONT/REAR toggle buttons entirely.

### TacticalHUD (LED + bars)

```
┌─────────────┐
│     CT      │
│  [35] ████  │  ← front LED display + bar gauge
│  ─────────  │  ← divider line
│  [12] ██░░  │  ← rear LED display + bar gauge
└─────────────┘
```

**Note:** Replace current side-by-side layout with stacked.

### PremiumMaterial (badges + dots)

```
┌─────────────┐
│     CT      │
│    ⬡35     │  ← front circular badge + dot indicators
│   ─────    │  ← divider
│    ⬡12     │  ← rear circular badge + dot indicators
└─────────────┘
```

**Note:** Replace current 3D layered plates with stacked.

### Consistent Elements

- Front section always on top
- Rear section always below
- Amber color (#f59e0b) for front
- Sky blue color (#0ea5e9) for rear
- Subtle divider line between sections
- Non-torso locations (HD, LA, RA, LL, RL) unchanged - single section

---

## Color Constants

Add to `src/components/customizer/armor/shared/ArmorFills.tsx`:

```typescript
export const FRONT_ARMOR_COLOR = '#f59e0b';  // amber-500
export const REAR_ARMOR_COLOR = '#0ea5e9';   // sky-500
```

---

## Files to Modify

```
src/components/customizer/armor/
├── LocationArmorEditor.tsx        ← REWRITE (direct front/rear controls)
├── variants/
│   ├── CleanTechDiagram.tsx       ← UPDATE (stacked layout, color consistency)
│   ├── NeonOperatorDiagram.tsx    ← UPDATE (stacked rings, remove toggle)
│   ├── TacticalHUDDiagram.tsx     ← UPDATE (stacked layout, remove side-by-side)
│   └── PremiumMaterialDiagram.tsx ← UPDATE (stacked layout, remove 3D layers)
└── shared/
    └── ArmorFills.tsx             ← ADD front/rear color constants
```

---

## Testing

### Unit Tests

**LocationArmorEditor.test.tsx:**
- Front slider changes only front value
- Rear slider changes only rear value
- Each slider caps at `maxArmor - otherValue`
- Number inputs work correctly
- Total display shows combined value

**Variant Tests (all 4):**
- Torso locations render both front and rear sections
- Correct colors applied (amber front, sky rear)
- Non-torso locations unchanged (single section)
- Click handlers work on stacked layout

### Manual Testing Checklist

- [ ] Select each torso location, verify editor shows direct controls
- [ ] Adjust front slider, verify rear is unaffected
- [ ] Adjust rear slider, verify front is unaffected
- [ ] Verify all 4 diagram variants show stacked front/rear
- [ ] Verify status colors (green/amber/red) work on both sections
- [ ] Test on mobile viewport sizes

---

## Out of Scope

- Data model changes (none needed)
- ArmorTab layout changes
- Auto-allocate logic changes
- Settings page changes
