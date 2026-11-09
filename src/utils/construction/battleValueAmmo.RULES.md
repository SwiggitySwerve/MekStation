# Offensive ammunition BV

The Mech weapon-input boundary captures listed mounted weapon BV before
post-scan Apollo and drone modifiers. The heat-tracking owner passes that
plain `ammoCapWeapons` list to the existing cap owner; weapon-stage BV keeps
its modifiers. Callers omitting the optional list retain their existing
input policy. Pinned `BVCalculator.java:1189-1242` builds caps with
`WeaponType.getBV(entity)`, independently of drone/Apollo in
`processWeapon` (:845-847,869-875). Nonbinding source ammo can mask an
incorrect cap without changing totals. The cap-input boundary excludes
represented one-shot OS/IOS weapons using the existing source-name classifier,
before normalization can erase the marker. Pinned
[BVCalculator.java:1230](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/battleValue/BVCalculator.java#L1230)
excludes `WeaponType.F_ONE_SHOT` in the ammo-cap weapon pass; the weapon stage
still values those launchers. Binding synthetic cases and mixed normal/OS/IOS
groups enforce the boundary. Complete native quantities, identities and
defensive caps do not acquire parity credit from this correction.

`battleValueAmmo.ts` owns grouped accumulation and the offensive ammunition cap.
Callers resolve equipment and choose keys; `addBVToAmmoCapGroup` accumulates each
value in encounter order. `sumCappedAmmoBV` iterates ordinary object keys, skips
only an undefined cap and adds `min(ammo group, weapon cap)`. It does not round,
clamp negative values, validate quantities or reinterpret nonfinite values.
The object representation, enumeration and floating-point operation order are
retained for compatibility.

The adapters deliberately retain different matching policies:

- Shared Mech/infantry: normalize weapon and ammo keys, use the existing
  exact/alias/Clan fallback matcher, and omit a zero match. The alias owner and
  its priority do not change.
- Vehicle: choose represented catalog type/rack groups for both launchers and
  bins, then use the shared matcher and cap. The vehicle rules document owns
  the additional identities and explicit override/fallback policy.
- ProtoMech: normalize weapon IDs; retain the already-derived ammo key; use an
  exact lookup. Skip undefined caps, retain explicit zero caps, and retain the
  outer nonempty weapon/ammo guard. Source shot counts are not connected yet.
- Aerospace: resolve equipment, lowercase raw keys only, skip unresolved weapon
  entries and omit missing or zero caps. Weapons in all arcs still share groups.
- Battle armor: `baAmmoPool` chooses the native `ammoType:rackSize` pool for
  launchers and bins (`battlearmor/battleArmorMounts.ts`). Both sides accumulate
  through `addBVToAmmoCapGroup`, and each pool with a launcher yields one capped
  `{ id, bvOverride }` entry via `sumCappedAmmoBV`; a pool without a launcher
  is omitted. The pre-cap pool report is unchanged.

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

`getCatalogAmmoBVGroup` owns the existing closed large-craft catalog type/rack
subset, reused by vehicle grouping. Its extraction preserves all large-craft
outputs; vehicle-specific group extensions do not expand large-craft admission.
Catalog family derivation (`extractWeaponTypeFromAmmoId`) and live weapon-key
normalization also belong to this owner. Remove a terminal bin-size suffix
before the ammunition suffix; physical bin size does not change its cap family.
Catalog BV, half-ton scaling, one-shot exclusions and CASE rules remain unchanged.
The historical audit keeps its separately documented normalization policy.

`getNativeAmmoBVGroup` supplies native enum/rack keys to vehicle ammo caps
(BVCalculator.java:1190-1240 at 48fcb2f64). Artillery and artillery cannons,
torpedoes and missiles retain distinct groups; both MML munition modes share
the MML rack. Listed weapon BV supplies each cap; supported one-shot identities
are excluded through the shared weapon-heat classifier. Legacy key APIs retain
their compatibility policy for other callers. Catalog values remain authoritative.

Physical native bin resolution retains `:ShotsN#` before normalizing identity.
Positive native counts seed original/max/remaining shots, including duplicate
mounts; native zero leaves the default capacity. Compatibility `:N` quantities
retain their empty `:0` behavior. Pinned MegaMek
48fcb2f64a1b3f2d575707ce5653dad64927b587, BLKFile.java:279-291,361-365.

The native ammo-group owner resolves the ambiguous canonical `long-tom` ID
through its catalog name, Long Tom Cannon. Native `ISLongTom` remains artillery;
the groups stay LONG_TOM_CANNON:20 and LONG_TOM:25 for every shared consumer.
Pinned MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
LongTomCannon.java:69-72; BVCalculator.java:1189-1240.

All shared cap consumers prefer `getNativeAmmoBVGroup` when a matching native
weapon pool exists. The legacy matcher remains the fallback for mixed native
and canonical launcher inputs, including torpedo Meks. Artillery and cannon
pools stay distinct. Vehicle flamers use their separate BV-5 catalog identity
(ISVehicleFlamer.java:77; BVCalculator.java:1199,1233 at pin 48fcb2f64).

getMachineGunArrayBVGroup maps canonical array identities to their gun caliber
and reuses getNativeAmmoBVGroup. Native MG type/rack strings stay defined once;
ordinary ammo matching behavior is unchanged. The array linker consumes those
plain group facts. Source: MekFileParser.java:928-944, pin 48fcb2f64.

Nail/rivet guns and their bins use NAIL_RIVET_GUN:1, separately from machine
guns. The existing validator fallback owns full-bin BV 1; existing half-bin
scaling gives 0.5 once. Native ammunition remains nonexplosive. Pinned MegaMek
48fcb2f64: AmmoType.java:13310-13360; NailRivetGunWeapon.java:60-78;
BVCalculator.java:1189-1242. No catalog identity or value changes are required.

Mech supplemental diagnostic pools retain native identities omitted by the
compatibility calculation: AMS, APDS, improved AC/5, improved Gauss, fluid guns,
coolant pods and the converter's primitive AC launcher qualifier. Their identity
mapping belongs to `getMechDiagnosticAmmoBVGroup`; it does not extend arithmetic
grouping. `projectMechAmmoBVPools` reuses the existing addition owner and fills
only missing diagnostic groups, preserving existing values and caller objects.
Listed source-mount BV supplies raw caps before weapon modifiers, independently
of physical bins. AMS/APDS facts never enter defensive or offensive arithmetic.
Availability uses already-admitted ammo values; a genuinely resolved zero-valued
physical bin additionally requires positive usable shots. Missing, unresolved,
empty and intrinsic one-shot facts do not invent terms. These diagnostics do not
establish effective-quantity or defensive-cap arithmetic parity.
