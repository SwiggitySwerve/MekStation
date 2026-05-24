# Tasks: Import Vehicle Weapon Mount Arcs

## 1. Adapter and Shared Rules

- [x] 1.1 Import vehicle equipment IDs from represented weapon identity fields.
- [x] 1.2 Derive vehicle mount arcs for chassis, body, turret, and sponson
  mounts from represented metadata.
- [x] 1.3 Carry multi-arc mount coverage through weapon status and attack
  declaration types.

## 2. Projection and Commit Agreement

- [x] 2.1 Use one shared helper for single-arc and multi-arc weapon coverage.
- [x] 2.2 Apply the helper to combat projection, attack commit validation, AI
  weapon filtering, and attack-planning conversion.
- [x] 2.3 Keep firing-arc overlay shading narrowed to represented multi-arc
  selected weapon mounts.

## 3. Verification

- [x] 3.1 Add adapter, vehicle arc utility, combat projection, attack builder,
  planning conversion, engine agreement, and map overlay tests.
- [x] 3.2 Focused Jest coverage passes.
- [x] 3.3 OpenSpec strict validation passes.
- [x] 3.4 Standard lint/type/build gates pass.
