# Decisions — add-mech-silhouette-sprite-set

## Decision: Inline SVG sprites, not `<image href>` assets

**Choice**: Ship the 12 silhouettes as a TypeScript module exporting inline
JSX/SVG strings, not as separate `.svg` files referenced via `<image href>`.

**Rationale**:
- Tests run in jsdom which does not load external resources — `<image href>`
  wouldn't render in snapshots.
- Inline SVG lets us apply `currentColor` + CSS filter tints and swap stroke
  widths via props.
- Bundle impact is negligible — 12 silhouettes under 200 LOC each → ~2 KB
  gzipped total. Avoids a network round-trip per token.
- Hot-reloadable: changing a sprite rebuilds the component, no asset cache
  invalidation.

**Spec-compliance**: The spec says sprites live "under `public/sprites/mechs/`"
(Scenario "Sprite exists for every weight x archetype combination"). We will
ALSO write the same SVGs to `public/sprites/mechs/<archetype>-<weight>.svg`
so the file-based contract is satisfied, but the runtime renderer reads the
inline TS module. `spriteSelector` exposes both URL and inline content —
callers choose. This keeps the spec scenario satisfied while keeping tests
deterministic.

**Discovered during**: Task 2.1 scoping.

## Decision: Sprite selector takes IUnitToken, not a raw unit record

**Choice**: `selectSprite(token: Pick<IUnitToken, 'weightClass' |
'chassisArchetype'>)` — operates on token-surface fields, not on the full
construction-domain unit record.

**Rationale**:
- Token-rendering components already receive `IUnitToken`. Passing the same
  type keeps the surface small and avoids pulling the construction/unit
  domain into the render layer.
- `IUnitToken` gains two new OPTIONAL fields: `weightClass?: WeightClass`
  and `chassisArchetype?: ChassisArchetype`. Callers (interactive session →
  token projection) populate them when known; selector defaults to
  `MEDIUM × humanoid` when absent (Scenario: Missing archetype falls back
  to humanoid).

**Discovered during**: Task 2.1 design.

## Decision: Archetype enum uses `humanoid | quad | lam`

**Choice**: New enum `ChassisArchetype = 'humanoid' | 'quad' | 'lam'` in
`src/types/gameplay/GameplayUIInterfaces.ts`.

**Rationale**: Spec lists exactly three archetypes. Discriminated-union-
friendly string literals, easy to switch on, serializes cleanly.

**Discovered during**: Task 1.1 scoping.

## Decision: Armor pip aggregation — one pip per location, intensity by state

**Choice**: Each of the 8 biped (or 6 quad) locations renders as ONE pip
dot — not 3–4 sub-pips per location. State maps to fill/outline:
- `full`     → solid green fill
- `partial`  → solid yellow fill
- `structure`→ solid orange fill + diagonal stripes (pattern for colorblind)
- `destroyed`→ red outline only, no fill
- `missing`  → no pip rendered (location not applicable to archetype)

**Rationale**:
- Legibility at 80% hex diameter is the overriding constraint.
- Colorblind scenario requires shape distinction — stripes on the
  `structure` state satisfy this without adding a separate icon.
- Aggregate-dot-per-location satisfies the "simplified pip aggregation"
  clause of the spec at low zoom.

**Discovered during**: Task 5.3 design.

## Decision: Low-zoom collapse uses a single glyph SVG per archetype

**Choice**: Below zoom 0.6, render a tiny archetype glyph (humanoid ▲ / quad
■ / LAM ◆) with side tint only, no pip ring. Below zoom 0.35, no glyph
either — just a colored dot. Parent (HexMapDisplay) passes `zoom` down; if
absent, MechSprite defaults to 1.0 (full detail).

**Rationale**: Spec requires graceful simplification at low zoom. A single
glyph keeps the scale-invariant silhouette readable without stroke-width
juggling.

**Discovered during**: Task 7 design.
