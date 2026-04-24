# Mech Silhouette Sprites

Homemade 2D silhouettes for the tactical map token renderer.

## Originality attestation

These SVGs are entirely homemade. They are composed of geometric
primitives (rect, polygon, circle) and do **not** reference or derive from
any licensed BattleTech, MechWarrior, or other third-party mech art. No
published unit is named, traced, or rendered here.

## Catalog

4 weight classes × 3 archetypes = 12 sprites:

- `humanoid-{light,medium,heavy,assault}.svg` — standard biped 'Mechs
- `quad-{light,medium,heavy,assault}.svg` — four-legged 'Mechs (no arms)
- `lam-{light,medium,heavy,assault}.svg` — Land-Air 'Mechs (humanoid + wings)

## Conventions

- viewBox `0 0 200 200` — anchor at center (100, 100).
- Every sprite includes a `<polygon id="facing-notch">` near the top
  (north). Rotation in the renderer carries the notch with the body.
- Fills use `currentColor` so the parent can tint via CSS `color`.
- The runtime renderer consumes **inline** versions of these sprites from
  `src/components/gameplay/sprites/spriteCatalog.ts` (the same geometry).
  The files here satisfy the spec's file-path contract and provide an
  out-of-band reference for future asset pipelines.

## Spec

`openspec/changes/add-mech-silhouette-sprite-set/specs/unit-sprite-system/spec.md`
