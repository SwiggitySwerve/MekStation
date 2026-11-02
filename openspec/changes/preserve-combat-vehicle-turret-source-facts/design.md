# Source boundaries and current owners

Pinned MegaMek: `48fcb2f64a1b3f2d575707ce5653dad64927b587`; mm-data: `50f7efef0c9f775b0258f8283525ed4f906e1985`.

`blkVehicleArmorLayout.ts` already owns motion-specific superheavy thresholds, accepted ordinary/six-side/rotor lengths and Front/Right/Left/Rear/turret identities. `equipmentMounts.ts` owns primary import policy and mount flags. Existing refused armor layouts remain available for inspection with diagnostics; this package does not replace that policy or reject supported superheavy/support geometry.

BLKTankFile.java:185-192,219-250 and BLKVTOLFile.java:129-191 distinguish installed layout from base-chassis allowances. BuildingBlock.java:135-157,342-373 uses case-insensitive tags and permissive numeric loading. The new allowance boundary accepts finite decimal/exponent lines, checks every line and retains the first; malformed/empty/nonfinite values fail with explicit compatibility diagnostics. Case-variant scalar collisions fail instead of choosing a value. Omni uses presence, regardless of payload. VTOL secondary allowances are ignored with raw input retained and a warning.

Raw negative sentinels belong to source context. The normalized contract already restricts allowance fields to nonnegative values and is unchanged; mapping carries values it accepts. The store uses baseChassisSecondaryTurretWeight while the raw/normalized contract names that source fact baseChassisTurret2Weight. One adapter owns that rename. Neither currentWeight nor removed maxWeight supplies a source allowance.

S10 must reuse current normalization and keep its adapter free of a second geometry classifier. Support handlers must reject only nonempty unknown blocks after normalization, preserving rotor, Turret 2 and six-side mappings. The original caller-owned document is not mutated; the projection result also returns its original document on failure. S14 remains responsible for remaining installed-empty/secondary handler wiring. Equipment resolution, full mass, nullable composition and BV are separate owners.
