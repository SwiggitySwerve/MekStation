# Mech-Correct Armor Diagram Design

**Date:** 2026-01-10
**Status:** Draft
**Author:** SwerveLabs

## Overview

Redesign the armor diagram to be more "mech correct" with two user-selectable display modes: a schematic grid layout with proper anatomical connections, and a detailed SVG silhouette with layered visual elements.

**Goals:**
- Create anatomically accurate mech body part relationships
- Provide detailed SVG silhouette that looks like a BattleMech
- Support both modes via user preference in Settings
- Handle front/rear armor in a combined view (no toggle)
- Work at partial size on desktop and full size on mobile

**Design Decisions Made:**
- Two modes: Schematic (grid) and Silhouette (SVG)
- Layered SVG architecture for future extensibility
- Combined front/rear display on torso locations
- Detailed illustration style for silhouette
- Setting stored in UI Preferences alongside theme

---

## Architecture

### Component Structure

```
src/components/armor/
├── ArmorDiagram.tsx              # Orchestrator - picks mode from settings
├── ArmorDiagramSettings.tsx      # Settings UI for mode toggle
│
├── schematic/                    # Mode 1: Grid-based
│   ├── SchematicDiagram.tsx      # Anatomically correct grid layout
│   └── SchematicLocation.tsx     # Individual location card
│
├── silhouette/                   # Mode 2: SVG-based
│   ├── SilhouetteDiagram.tsx     # Composites SVG layers
│   ├── SilhouetteLocation.tsx    # Clickable SVG region
│   └── layers/
│       ├── BipedBase.tsx         # Hitbox paths (required)
│       ├── BipedFill.tsx         # Armor color fills (required)
│       └── BipedDetail.tsx       # Panel lines, joints (optional)
│
└── shared/
    ├── ArmorControls.tsx         # +/- buttons, quick add (reused)
    ├── ArmorTooltip.tsx          # Hover info (reused)
    └── types.ts                  # Shared interfaces
```

### Key Principle

Editing logic stays shared. Only rendering differs between modes. Both modes use the same `ArmorControls` component and the same data flow.

### Settings Integration

Add to existing UI Preferences in Settings:

```typescript
interface UIPreferences {
  theme: 'light' | 'dark' | 'system';
  armorDiagramMode: 'schematic' | 'silhouette';  // NEW
}
```

Default: `'silhouette'` (more visually impressive)

Storage: localStorage via existing settings context.

---

## Schematic Mode

### Current Problem

The existing grid treats all locations as independent boxes. Arms float beside the torso instead of connecting at the shoulders. Legs sit below center torso instead of below their respective side torsos.

### Anatomically Correct Layout

```
Current:                      Corrected:

      [HEAD]                       [HEAD]
                                     │
[LT] [CT] [CT] [RT]               ┌──┴──┐
[LA] [CT] [CT] [RA]          [LA]─┤LT CT RT├─[RA]
[LL] [CT] [CT] [RL]               └┬────┬┘
                                [LL]    [RL]
```

### Anatomical Rules

- Head connects directly above center torso
- Left/right torsos flank center torso horizontally
- Arms attach to outer edges of side torsos (shoulder height)
- Legs attach below side torsos, not center torso
- Center torso is the structural core, slightly larger

### Grid Implementation

```css
grid-template-areas:
  ".    .    head   .    ."
  "la   lt   ct     rt   ra"
  ".    ll   .      rl   ."
```

Cards get visual connectors (thin lines or subtle shadows) showing structural relationships. Each location card remains expandable with existing +5/+10/Max controls.

### Mobile Layout

Stack vertically but group by connection:
1. Head
2. Torsos (CT, LT, RT)
3. Arms (LA, RA)
4. Legs (LL, RL)

Subtle indentation shows hierarchy.

---

## Silhouette Mode

### Layer Architecture

Layers stack bottom to top:

| Layer | Always Loaded | Purpose |
|-------|---------------|---------|
| 1. Base Hitbox | Yes | Invisible `<path>` regions for click detection |
| 2. Armor Fill | Yes | Colored shapes showing armor status (green/amber/red) |
| 3. Detail | Desktop: hover only, Mobile: always | Panel lines, cockpit, joints, vents |
| 4. Interaction | Yes | CSS-driven glow/pulse on hover and selection |

### Layer Responsibilities

**Base Hitbox Layer:**
- Defines clickable `<path>` regions for each location
- Invisible but receives pointer events
- Each path has `data-location="CENTER_TORSO"` attribute

**Armor Fill Layer:**
- Colored shapes matching hitbox paths
- Shows armor status via color gradient
- Updates reactively when armor values change

**Detail Layer:**
- Structural lines, cockpit glass, joints, vents
- Pure decoration, no interactivity
- Loaded on hover for desktop, always for mobile

**Interaction Layer:**
- CSS-driven visual feedback
- Glow/pulse effects on hover and selection

### Click Flow

1. User clicks anywhere on mech silhouette
2. Base hitbox layer catches the event
3. Path's `data-location` attribute identifies the region
4. Parent component receives location, opens armor controls
5. Armor fill updates color based on new values

### Responsive Behavior

- **Mobile (full size):** All layers visible, detail layer always shown
- **Desktop (partial):** Detail layer shown on hover only

---

## Mech Silhouette Design

### Biped Anatomy

```
                 ╭───╮
                ╭┤ H ├╮          H = Head (cockpit visible)
               ╭┴─────┴╮
              ╱    │    ╲
         ╭───╮─────┼─────╭───╮
        ╱ LA ╲  LT │ RT ╱ RA ╲   Arms angled outward
       ╱      ╲ ╲  │  ╱╱      ╲
      ▕        ▏ ╲ CT╱ ▕        ▏
       ╲      ╱   ╲│╱   ╲      ╱
        ╲    ╱     │     ╲    ╱
         ╰──╯    ╭─┴─╮    ╰──╯
                ╱     ╲
              ╭╯       ╰╮
             ▕ LL     RL ▏       Legs with knee/ankle hints
              ▕       ▕
              ╰┬─╮ ╭─┬╯
               ╰─╯ ╰─╯           Feet
```

### Hitbox Regions (Base Layer)

Each location is a single `<path>` element:

| Location | Shape |
|----------|-------|
| Head | Rounded trapezoid with cockpit indent |
| Center Torso | Tapered rectangle, widest at shoulders |
| Side Torsos | Wedge shapes flanking CT |
| Arms | Elongated shapes, angled 15° outward |
| Legs | Two-segment (thigh/shin), separated by knee joint |

### Detail Elements

| Element | Location | Purpose |
|---------|----------|---------|
| Cockpit glass | Head | Reflective highlight |
| Shoulder joints | LT/RT edge | Circular pivots |
| Panel lines | All torsos | Horizontal segments |
| Knee joints | Legs | Circular joints |
| Foot pads | Leg bottoms | Ground contact |
| Vent slats | Side torsos | 3-4 horizontal lines |

### SVG Viewbox

`0 0 200 300` - Tall portrait orientation, works for both mobile and sidebar.

---

## Front/Rear Armor Handling

### Combined Display (No Toggle)

Show both front and rear on torso locations simultaneously:

```
Schematic card:                 Silhouette region:

┌─────────────────────┐         ┌─────────────┐
│ Center Torso        │         │    24/47    │ ← Front (top)
│                     │         │─────────────│
│  Front  24/47  ███░ │         │    12/23    │ ← Rear (bottom)
│  Rear   12/23  ██░░ │         └─────────────┘
└─────────────────────┘
```

### Location Display Rules

| Location | Display |
|----------|---------|
| Head | Single value (no rear) |
| CT, LT, RT | Split: Front value on top, Rear value on bottom |
| Arms | Single value (no rear) |
| Legs | Single value (no rear) |

### Editing Flow

When clicking/expanding a torso location, both front and rear controls appear:

```
┌─────────────────────────────────┐
│ Center Torso                    │
├─────────────────────────────────┤
│ Front                     24/47 │
│  [+5]  [+10]  [+20]  [Max]      │
│      (−)    24    (+)           │
├─────────────────────────────────┤
│ Rear                      12/23 │
│  [+5]  [+10]  [+20]  [Max]      │
│      (−)    12    (+)           │
└─────────────────────────────────┘
```

### Silhouette Visual

Torso regions have a subtle horizontal divider line. Top half = front, bottom half = rear. Each half is independently clickable.

---

## Interaction States & Accessibility

### Visual States

| State | Schematic | Silhouette |
|-------|-----------|------------|
| Default | White card, subtle border | Filled region, panel lines visible |
| Hover | Light blue background | Soft glow on region edges |
| Selected | Blue border, expanded controls | Bright glow, controls panel opens |
| Disabled | Grayed out, no pointer | Dimmed opacity, no pointer events |

### Keyboard Navigation

```
Tab order (follows anatomy top-to-bottom, left-to-right):
HEAD → LT → CT → RT → LA → RA → LL → RL

Enter/Space: Select location, open controls
Arrow keys: Navigate between controls within location
Escape: Close controls, return focus to location
```

### ARIA Implementation

```tsx
<path
  role="button"
  tabIndex={0}
  aria-label="Center Torso: Front 24 of 47, Rear 12 of 23"
  aria-expanded={isSelected}
  aria-controls="ct-armor-controls"
  data-location="CENTER_TORSO"
/>
```

### Color Accessibility

- Don't rely on color alone - include text values (24/47)
- Progress bars have visible boundaries
- Selected state uses border/glow, not just color change
- All status colors meet WCAG AA contrast

### Touch Targets

All clickable regions minimum 44×44px, even on the silhouette.

---

## Testing & Validation

### Unit Tests

- Mode switching based on settings
- Armor value updates propagate to both modes
- Front/rear split display for torso locations
- Keyboard navigation order
- ARIA attributes present and correct

### Visual Regression

- Schematic layout at mobile and desktop breakpoints
- Silhouette rendering at various sizes
- Hover and selection states
- Detail layer visibility rules

### Accessibility Testing

- Screen reader announces all location values
- Keyboard-only navigation works completely
- Focus indicators visible in both modes
- Color contrast passes WCAG AA

### Cross-Browser

- SVG rendering in Safari, Chrome, Firefox, Edge
- CSS grid layout in all browsers
- Touch interactions on iOS and Android

---

## Success Criteria

- [ ] Two modes (Schematic/Silhouette) selectable in Settings
- [ ] Schematic shows anatomically correct body part relationships
- [ ] Silhouette looks like a recognizable BattleMech
- [ ] Layered SVG architecture supports future extensibility
- [ ] Front/rear armor shown together on torso locations
- [ ] Works at partial size (desktop sidebar) and full size (mobile)
- [ ] Touch targets ≥44×44px
- [ ] Keyboard navigable with proper ARIA
- [ ] Detail layer: hover-only on desktop, always on mobile
- [ ] Settings preference persists across sessions

---

## Implementation Phases

### Phase 1: Shared Infrastructure
**Goal:** Extract shared controls and set up mode switching

- Extract `ArmorControls.tsx` from existing location component
- Create shared types in `shared/types.ts`
- Add `armorDiagramMode` to settings context
- Update Settings UI with diagram mode picker
- Create `ArmorDiagram.tsx` orchestrator that switches modes
- Verify settings persistence works

**Success criteria:** Mode can be changed in settings, preference persists

---

### Phase 2: Schematic Mode
**Goal:** Anatomically correct grid layout

- Create `SchematicDiagram.tsx` with corrected CSS grid
- Create `SchematicLocation.tsx` card component
- Add visual connectors between related body parts
- Implement combined front/rear display for torsos
- Add expand/collapse with shared `ArmorControls`
- Mobile responsive stacking with body part groups

**Success criteria:** Schematic mode fully functional with correct anatomy

---

### Phase 3: Silhouette Base Layer
**Goal:** Clickable mech outline

- Create `BipedBase.tsx` with hitbox `<path>` elements
- Create `SilhouetteDiagram.tsx` layer compositor
- Create `SilhouetteLocation.tsx` for click handling
- Implement `data-location` attribute system
- Add keyboard navigation and focus management
- Connect to shared `ArmorControls`

**Success criteria:** Clicking silhouette regions opens armor controls

---

### Phase 4: Silhouette Fill Layer
**Goal:** Armor status visualization

- Create `BipedFill.tsx` with colored regions
- Implement status color gradient (green → red)
- Add front/rear split visual for torsos
- Connect to armor data for reactive updates
- Ensure fill paths align with hitbox paths

**Success criteria:** Silhouette colors reflect armor allocation status

---

### Phase 5: Silhouette Detail Layer
**Goal:** Visual polish and immersion

- Create `BipedDetail.tsx` with decorative elements
- Add cockpit glass, panel lines, joints, vents
- Implement hover-only visibility for desktop
- Always-visible for mobile
- CSS transitions for smooth reveal

**Success criteria:** Detail layer adds visual richness without clutter

---

### Phase 6: Interaction Polish
**Goal:** Refined user experience

- Add hover glow effects
- Add selection pulse/highlight
- Implement smooth transitions between states
- Add haptic feedback for mobile
- Performance optimization
- Cross-browser testing

**Success criteria:** Interactions feel polished and responsive

---

## Future Extensibility

The layered architecture supports future enhancements:

| Future Feature | How It Fits |
|----------------|-------------|
| Quad chassis | Add `QuadBase.tsx`, `QuadFill.tsx`, `QuadDetail.tsx` |
| LAM chassis | Add LAM-specific layer files |
| Damage states | Add `BipedDamage.tsx` overlay layer |
| Equipment markers | Add `BipedEquipment.tsx` layer showing weapon mounts |
| Themes/skins | Swap detail layers for different visual styles |
| Animation | Animate individual layers independently |

Each new capability adds layers without modifying the base hitbox system.

---

## Implementation Notes

This design prioritizes:
1. **Modularity** — Layered architecture allows independent iteration
2. **Accessibility** — Keyboard and screen reader support from the start
3. **Responsiveness** — Works at all sizes without separate codebases
4. **Extensibility** — Future chassis types and features slot in cleanly
5. **User choice** — Two modes serve different preferences

The schematic mode is functional and efficient. The silhouette mode is immersive and visually impressive. Users choose what works for them.
