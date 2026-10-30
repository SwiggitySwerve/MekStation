# Offensive ammunition BV

`battleValueAmmo.ts` owns grouped accumulation and the offensive ammunition cap.
Callers resolve equipment and choose keys; `addBVToAmmoCapGroup` accumulates each
value in encounter order. `sumCappedAmmoBV` iterates ordinary object keys, skips
only an undefined cap and adds `min(ammo group, weapon cap)`. It does not round,
clamp negative values, validate quantities or reinterpret nonfinite values.
The object representation, enumeration and floating-point operation order are
retained for compatibility.

The adapters deliberately retain different matching policies:

- Shared Mech/vehicle/infantry: normalize weapon and ammo keys, use the existing
  exact/alias/Clan fallback matcher, and omit a zero match. The alias owner and
  its priority do not change.
- ProtoMech: normalize weapon IDs; retain the already-derived ammo key; use an
  exact lookup. Skip undefined caps, retain explicit zero caps, and retain the
  outer nonempty weapon/ammo guard. Source shot counts are not connected yet.
- Aerospace: resolve equipment, lowercase raw keys only, skip unresolved weapon
  entries and omit missing or zero caps. Weapons in all arcs still share groups.

These policies are preserved behavior, not a claim of native type/rack grouping.
Pinned [BVCalculator.java](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/battleValue/BVCalculator.java)
owns MegaMek's `processAmmo`, assembled ammo groups and quantity calculation.
Connecting that native contract requires resolved ammunition identities, effective
shot quantities and mount locations; stale source provenance is not effective
ammunition state. That correction must be independently verified after this
preserving extraction.

Defensive AMS/screen caps are a different rule and remain separate, including
the defensive AMS calculation in `scripts/validate-bv-calculator.ts`. The ammo
matching audit uses the shared matcher and accumulation helper for its dummy
BV=1 groups; it does not calculate this cap. Its normalization and Set-based
deduplication remain unchanged.
No source admission, catalog, serialization, stored cache or numerical rule changes
are made by the extraction. Full source-ammunition and BV parity remain open.
