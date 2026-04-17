# Tasks: Add Mech Silhouette Sprite Set

## 1. Sprite Catalog Design

- [ ] 1.1 Commission / draw 12 homemade silhouettes: 4 weight classes ×
      3 archetypes (humanoid biped, quad, LAM)
- [ ] 1.2 Confirm no asset resembles licensed BattleTech/MechWarrior art
      (visual originality review)
- [ ] 1.3 Export each as an SVG at a canonical 200×200 viewBox with
      transparent background
- [ ] 1.4 Place files under `public/sprites/mechs/<archetype>-<weight>.svg`

## 2. Sprite Selector Utility

- [ ] 2.1 Create `src/utils/sprites/spriteSelector.ts` exporting
      `selectSprite(unit)`
- [ ] 2.2 Map unit `weightClass` → `light | medium | heavy | assault`
- [ ] 2.3 Derive archetype from unit data: `isQuad`, `isLAM`, else humanoid
- [ ] 2.4 Return the resolved sprite URL + metadata (viewBox, anchor)
- [ ] 2.5 Unit tests for every weight-class × archetype combination

## 3. MechSprite Component

- [ ] 3.1 Create `src/components/gameplay/sprites/MechSprite.tsx`
- [ ] 3.2 Props: `unit`, `facing`, `scale`, `sideColor`, `isSelected`
- [ ] 3.3 Load the silhouette via `<image>` or inline SVG symbol
- [ ] 3.4 Apply side tint (Player=blue, Opponent=red, Neutral=gray) via
      CSS filter or `<feColorMatrix>`
- [ ] 3.5 Apply `transform: rotate(facing * 60deg)` about the sprite center
- [ ] 3.6 Render selection ring when `isSelected` is true

## 4. Facing Indicator

- [ ] 4.1 Each silhouette SVG includes a directional notch element
      identified by `id="facing-notch"`
- [ ] 4.2 Notch orients along the sprite's "front" in its base SVG
- [ ] 4.3 Sprite rotation carries the notch with it (no separate overlay)
- [ ] 4.4 Facing changes animate over 150ms ease-out

## 5. Armor Pip Overlay Ring

- [ ] 5.1 Create `src/components/gameplay/sprites/ArmorPipRing.tsx`
- [ ] 5.2 Render 8 pip groups around the sprite: Head, CT, LT, RT, LA,
      RA, LL, RL (mechs) or Head, CT, FL, FR, RL, RR (quads)
- [ ] 5.3 Each pip group colors by location state: full armor=green,
      partial=yellow, structure exposed=orange, destroyed=red-outline
- [ ] 5.4 Pip layout respects archetype (quads show legs in a cross,
      LAMs show compact)
- [ ] 5.5 Rings maintain legibility at 50% hex scale via simplified pip
      aggregation (single dot per location when <50%)

## 6. Swap UnitToken Renderer

- [ ] 6.1 Replace abstract marker in `UnitToken.tsx` with `MechSprite` + `ArmorPipRing`
- [ ] 6.2 Preserve existing hit-testing (the outer `<g>` remains the
      click target)
- [ ] 6.3 Preserve selection binding contract with `useGameplayStore`
- [ ] 6.4 Preserve the side-color tint currently applied to the marker

## 7. Zoom + Scale Behavior

- [ ] 7.1 At zoom >= 1.0, sprites render at 80% of hex size
- [ ] 7.2 At zoom < 0.6, sprites collapse to archetype glyph + class tint
      only, pip ring hidden
- [ ] 7.3 Pip ring never obscures neighboring hex content
- [ ] 7.4 Text labels (unit name, call sign) scale with zoom but never
      below 10px

## 8. Accessibility + Colorblind

- [ ] 8.1 Side tint uses shape-distinguishable overlays (not color-only)
- [ ] 8.2 Armor pip states use both color and pattern (solid / striped /
      empty)
- [ ] 8.3 Sprites respect the existing `prefers-reduced-motion` setting
      for facing animation

## 9. Tests

- [ ] 9.1 Unit test: `selectSprite` returns correct bundle for each
      weight-class × archetype combination
- [ ] 9.2 Unit test: `MechSprite` applies rotation matching
      `facing * 60deg`
- [ ] 9.3 Unit test: `ArmorPipRing` renders red-outline pip when a
      location's structure is 0
- [ ] 9.4 Visual regression snapshot for each of the 12 sprites at
      default scale
- [ ] 9.5 Integration test: selecting a quad unit renders quad layout
      pips

## 10. Spec Compliance

- [ ] 10.1 Every requirement in `unit-sprite-system` spec has at least one
      GIVEN/WHEN/THEN scenario
- [ ] 10.2 Every requirement in `tactical-map-interface` delta has at
      least one scenario
- [ ] 10.3 `openspec validate add-mech-silhouette-sprite-set --strict`
      passes clean
