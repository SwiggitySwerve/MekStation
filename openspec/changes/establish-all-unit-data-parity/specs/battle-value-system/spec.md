## ADDED Requirements

### Requirement: ProtoMech positive native ammo availability diagnostics

The ProtoMech offensive owner SHALL retain optional source-backed diagnostic
facts for finite positive bin values already supplied by its existing native
ammo resolver with its existing registry native group, independently of weapon
matching. Facts SHALL retain source ids, indices, supplied locations and
native groups in physical order. The trace SHALL aggregate actual available
values through the existing public addition owner without changing resolution,
quantities, admission, exact-key caps, arithmetic, old facts or totals. Missing
and unsupported facts SHALL remain absent; the trace SHALL NOT invent zero,
identity or a bin from launcher presence.

The owner SHALL optionally retain finite positive raw cap values from the
existing public native pool owner for groups represented by real positive
native bins. Its native cap output SHALL remain diagnostic only; the
ProtoMech exact-key arithmetic, matching, quantities and all old numerical
outputs SHALL remain unchanged. The trace SHALL format these retained values
as `ammo.cap.<nativeGroup>` without computing caps or inferring identities.

#### Scenario: Source-backed native raw cap and shared-group accumulation

- **GIVEN** two admitted SRM 2 weapons valued at 21 each and repeated real positive SRM 2 bins
- **WHEN** the public ProtoMech breakdown and trace are calculated
- **THEN** the existing native pool owner's accumulated cap SHALL appear once as `ammo.cap.SRM:2` with value 42, independently of the number of bins
- **AND** all original source quantities, exact-key capped ammo, scalar values, modifiers and totals SHALL remain unchanged

#### Scenario: Real positive bins and retained arithmetic

- **GIVEN** two real SRM 2 bins with 7 and 3 shots valued by the existing native ammo owner with registry group SRM:2
- **WHEN** the public ProtoMech breakdown and trace are calculated
- **THEN** the actual bin values SHALL be retained in physical order and added to `ammo.available.SRM:2` through the existing public owner
- **AND** original ammunition quantities, cap calculations, source data, weapon/misc facts and numerical results SHALL remain unchanged

#### Scenario: Unmatched native bin retains availability

- **GIVEN** a real positive SRM 2 bin resolved by the existing native ammo owner without a matching weapon
- **WHEN** the public ProtoMech breakdown and trace are calculated
- **THEN** its actual value SHALL appear in `ammo.available.SRM:2` using the resolver's existing registry group
- **AND** its enum-form arithmetic weaponType and original BV SHALL remain unchanged with no invented cap

#### Scenario: Absent, excluded and unsupported facts

- **GIVEN** a legacy breakdown, launcher without a bin, empty or unresolved bin, generic fallback or unsupported public group
- **WHEN** positive native ammo availability is projected
- **THEN** no absent or unsupported fact SHALL become an invented zero-valued availability or identity
- **AND** launcher-only, unmatched-bin and legacy inputs without cap facts SHALL NOT acquire an inferred cap
- **AND** all original scalar terms and existing projections SHALL remain unchanged

### Requirement: ProtoMech native offensive-misc diagnostic projection

The ProtoMech offensive owner SHALL retain optional diagnostic facts only for
finite positive values already computed by its existing native offensive-misc
owner. Each fact SHALL retain its actual local source id, index and supplied
location in mounted order without additional resolution, formulas, quantity
expansion or modifiers. The trace SHALL render known native location numbers
and actual ids, preserving native last-put semantics for duplicate keys.
Absent, zero/fallback or unsupported facts SHALL NOT become invented values or
locations. Existing admission, arithmetic, weapon facts, source data and totals
SHALL remain unchanged.

#### Scenario: Actual native miscellaneous values at Torso

- **GIVEN** a represented magnetic clamp valued at 1, electric-discharge equipment valued at 32 or a quad melee system valued at 5 by the existing owner
- **WHEN** its public ProtoMech breakdown and trace are calculated
- **THEN** the actual value SHALL appear at its supplied Torso native location 2 and source id
- **AND** the numeric key component SHALL NOT claim an equipment index
- **AND** all existing arithmetic and weapon projections SHALL remain unchanged

#### Scenario: Missing facts and repeated native keys

- **GIVEN** a legacy breakdown, excluded zero/fallback fact, unrepresented location or repeated native location/id key
- **WHEN** its optional diagnostic facts are projected
- **THEN** absence SHALL remain absent and unrepresented locations SHALL NOT be inferred
- **AND** repeated keys SHALL retain the final actual fact value in mounted order rather than a new arithmetic sum
- **AND** original numerical outputs and all individual source facts SHALL remain unchanged

### Requirement: ProtoMech weapon-mount diagnostic projection

The ProtoMech offensive owner SHALL retain optional diagnostic snapshots of
already-admitted resolved weapon values, in original mounted order with local
equipment indices, ids and supplied public input locations. The trace SHALL
format only represented native location abbreviations, preserving each actual
value without additional resolution, quantity expansion, rounding or modifiers.
Local mount keys SHALL NOT assert native equipment identity. Existing weapon
admission, main-gun valuation, ammo policy, scalar terms, aggregates, totals and
source units SHALL remain unchanged. Absent facts SHALL remain absent; the
projection SHALL NOT invent zero values or infer unknown/Body locations.

#### Scenario: Actual mounted values and retained order

- **GIVEN** the pinned Minotaur-P2 with arm weapon values 19 and 19 and main-gun value 39
- **WHEN** its public ProtoMech BV breakdown and trace are calculated
- **THEN** the trace SHALL expose those actual values at RA, LA and MG with their original local mount indices and ids
- **AND** the weapon subtotal SHALL remain 77 and all existing arithmetic and source data SHALL remain unchanged
- **AND** repeated weapons at one location SHALL remain distinct mount facts, allowing comparison of counts and descending values

#### Scenario: Unavailable facts and locations

- **GIVEN** an unarmed or legacy breakdown, excluded non-weapon equipment, or an admitted fact with an unrepresented public location
- **WHEN** its ProtoMech diagnostic trace is projected
- **THEN** absent or excluded weapon facts SHALL NOT become zero-valued terms or empty count groups
- **AND** an unrepresented location SHALL retain its original fact without inventing a native location term
- **AND** all original scalar terms SHALL remain unchanged

### Requirement: Mech physical NARC availability diagnostics

The Mech trace SHALL expose `ammo.available.NARC:1` and `ammo.available.INARC:1` from actual physical source
bins recognized by existing public native-bin and ammo-resolution owners.
Only supported NARC or iNARC bins with positive shots and a genuinely resolved BV of
zero SHALL supply optional diagnostic facts. The trace SHALL reuse existing
public grouping and addition owners, preserving original arithmetic ammo lists,
pools, quantities, explosivity, modifiers, computed values and existing nonzero
available entries. Missing facts SHALL remain absent; runtime projection SHALL
NOT obtain values from references or launcher presence. Other ammo groups
SHALL retain their existing behavior.

#### Scenario: Genuine zero differs from an absent bin

- **GIVEN** an installed physical ISNarc Pods bin whose public owners resolve six shots and BV 0
- **WHEN** Mech diagnostic availability is projected
- **THEN** `ammo.available.NARC:1` SHALL be present with the actual resolved value 0
- **AND** the original arithmetic ammo inputs, pools and calculated BV SHALL remain unchanged

#### Scenario: Unavailable or excluded source facts

- **GIVEN** no physical bin, an unresolved token, an empty bin, or intrinsic one-shot ammo without a physical source bin
- **WHEN** NARC diagnostic source facts are collected
- **THEN** none SHALL invent a NARC available value or an optional source fact
- **AND** an existing nonzero available value SHALL NOT be overwritten by an added genuine zero-valued bin

#### Scenario: iNARC source values and distinct native groups

- **GIVEN** a represented standard or explosive iNARC physical bin whose public owners resolve four shots and BV 0
- **WHEN** Mech diagnostic availability is projected
- **THEN** `ammo.available.INARC:1` SHALL expose that actual value through the existing collector and public grouping owner
- **AND** an ordinary NARC available key SHALL remain absent unless a real ordinary NARC bin supplies it
- **AND** ordinary NARC facts SHALL retain their subsequence and physical order among added iNARC facts
- **AND** original arithmetic ammo lists, pools, quantities, explosivity, modifiers and computed BV SHALL remain unchanged

### Requirement: Mech torpedo cap diagnostic identity

The Mech trace SHALL project raw torpedo launcher caps from actual admitted,
resolved source mounts using the existing public ammo cap owner and its native
type/rack identity. It SHALL preserve the legacy arithmetic weapon ids, cap
pools, ammunition values, modifiers and totals. Optional diagnostic source facts
SHALL follow existing quantity expansion, mount order, one-shot exclusion and
pre-modifier values. Absent or unresolved facts SHALL NOT become zero values.

#### Scenario: Torpedo source identity and unchanged arithmetic

- **GIVEN** the pinned Javelin JVN-10U with two SRT 6 mounts, each listed at 59 BV
- **WHEN** native diagnostic terms are projected
- **THEN** `ammo.cap.SRM_TORPEDO:6` SHALL equal 118 through the existing cap owner
- **AND** the arithmetic `ammoPools.cap.SRM:6`, available ammo 14 and all computed BV values SHALL remain unchanged

#### Scenario: Mixed sources and optional facts

- **GIVEN** one ordinary SRM 6 and one SRT 6 with listed BV 59 each
- **WHEN** diagnostic caps are projected
- **THEN** the native SRM 6 and SRT 6 diagnostic caps SHALL each equal 59 while the existing arithmetic missile pool remains 118
- **AND** a unit without an admitted resolved torpedo SHALL retain absent diagnostic source facts and its original cap projection

### Requirement: Native machine gun array critical links

The shared equipment BV owner SHALL link each array in mounted order to at
most four unused, matching-caliber guns at its physical location, following
pinned MegaMek 48fcb2f64 MekFileParser.java:894-945. Ordered Mech critical
slots SHALL skip initial nonqualifying or used mounts, then stop at the first
nonqualifying slot after linking begins. Only an empty critical selection
SHALL fall back to the existing weapon-list search. Array BV SHALL be the
unrounded linked base sum times 0.67, additional to the individual guns
(BVCalculator.java:807-816). Family-specific admission, overrides, guards,
modifiers and no-critical fallback policies SHALL be preserved.

#### Scenario: Two distinct three-gun runs

- **GIVEN** two arrays and six matching guns in two three-gun critical runs at one location, as on Black Lanner F LA and Linebacker I LA/RA
- **WHEN** array links and BV are computed
- **THEN** both arrays SHALL contribute 10.05, with location sum 20.1
- **AND** matching the location total with a 13.4/6.7 partition SHALL NOT count as mount parity

#### Scenario: No qualifying critical selection

- **GIVEN** an array with no qualifying critical guns and six matching weapon-list guns at its location
- **WHEN** it and a second array are linked
- **THEN** the unchanged fallback SHALL link four and two guns for 13.4 and 6.7
- **AND** a critical run containing a zero-BV gun SHALL count as a selection and SHALL NOT trigger fallback merely because its sum is zero

### Requirement: DropShip mount valuation

The aerospace BV owner SHALL resolve represented DropShip mounts into six-arc
weapon BV, heat and arc-local ammo facts using the existing equipment resolver.
A bay-start marker SHALL count its weapon once; rear side mounts SHALL use the
corresponding aft-side arc. Supported ammo SHALL use its catalog bin shot count
and native integer multi-ton ratio, with depleted bins contributing zero.
Unsupported identities, capital weapons, links, quantities and arcs SHALL be
reported with mount indices and reasons, never silently valued at zero.
Partial arc facts SHALL NOT authorize complete DropShip dispatch.

#### Scenario: Supported mounts and native quantities

- **GIVEN** a bay-start PPC, a rear left-side laser and AC/5 ammo with 39 shots
- **WHEN** mount facts are resolved
- **THEN** the PPC SHALL count once, the laser SHALL use the left-aft arc and the ammo SHALL count one native bin
- **AND** a matching weapon in another arc SHALL NOT supply an ammo cap

#### Scenario: Unrepresented mounts remain explicit

- **GIVEN** a capital weapon, an unrepresented link or malformed mount facts
- **WHEN** mount facts are resolved
- **THEN** each unsupported mount SHALL be reported and complete BV SHALL remain unavailable

### Requirement: Large aerospace offensive fire pool

The aerospace BV owner SHALL provide a separate six-arc offensive stage for
already-valued native weapon and ammunition facts. It SHALL select the highest
weapon-BV arc in nose, left, left-aft, aft, right-aft, right order, then the
stronger adjacent arc (clockwise on ties). It SHALL apply cumulative heat to
the adjacent arc weights, cap ammunition within each native type/rack and arc,
and apply the existing speed factor to maximum thrust. Offensive equipment
SHALL be added outside arc weights. Ungrouped selection values and grouped
weapon additions after arc weighting SHALL remain distinct. This stage SHALL NOT imply complete
DropShip dispatch: source mount valuation, links and final adjustments remain
required before returning complete scope.

#### Scenario: Union offensive stage from native facts

- **GIVEN** independently valued Union (2708) weapons, ammo, heat capacity 90 and maximum thrust 5
- **WHEN** the six-arc stage runs
- **THEN** weapon BV SHALL be 2101.25, ammunition BV 238.5 and offensive BV 2339.75
- **AND** these already-valued facts alone SHALL NOT authorize complete dispatch

#### Scenario: Strict cumulative heat and local ammunition caps

- **GIVEN** primary-arc heat exactly equal to heat capacity
- **WHEN** the adjacent arcs are processed
- **THEN** the stronger adjacent arc SHALL retain full value
- **AND** the weaker adjacent arc SHALL use 0.25 if cumulative heat exceeds capacity
- **AND** ammo SHALL NOT borrow a matching weapon cap from another arc
- **AND** missing, duplicate, unsupported or nonfinite stage facts SHALL be rejected

### Requirement: Large aerospace weapon-group diagnostic projection

The large aerospace mount owner SHALL retain, for each arc, the equal-mount
groups the native calculator sums before valuation (same type, physical
location, rear flag and link type), and the complete trace SHALL project one
weapon term per group: count times link-multiplied value times the arc weight,
plus one capacitor addition per group after weighting. Terms SHALL be keyed by
the physical location abbreviation (DropShip wings LS and RS; otherwise NOS,
FLS, FRS, ALS, ARS, AFT, LBS, RBS), never by the BV arc. Local indices SHALL NOT
assert native equipment identity. Existing mount valuation, arc selection,
aggregates, totals and defensive-only scope SHALL remain unchanged, and
defensive-only results SHALL NOT receive weapon terms.

#### Scenario: Rear mounts keep their physical location

- **GIVEN** the pinned Aqueduct Liquid Carrier with rear-mounted medium lasers on each wing
- **WHEN** its complete large aerospace trace is calculated
- **THEN** the wing weapons SHALL appear at LS and RS with values 46 and 23, though their BV arcs are the rear wing arcs
- **AND** the nose, aft large laser and aft machine gun SHALL appear at NOS, AFT and AFT with values 30.75, 123 and 10
- **AND** the terms SHALL sum to the weapon fire-pool BV and final BV 919 SHALL remain unchanged

### Requirement: Large aerospace native ammunition diagnostic projection

The complete large aerospace trace SHALL project the native ammunition pools the
pinned calculator assembles: per BV arc, `ammo.cap` (the unweighted base BV of
ammo-using weapons) and `ammo.available` (the unweighted ammunition BV with
multi-ton ratio, omitting depleted bins), keyed `<BV arc index>:<type>:<rack>`;
and `ammo.arc.<name>` for every arc, the weighted and capped ammunition added
when that arc is processed, including zero. A screen launcher SHALL keep its
native `SCREEN_LAUNCHER:0` cap entry as a trace-only fact without becoming an
offensive weapon or ammunition. Arc names SHALL follow the unit kind (DropShip
wings `Left Side`, `Left Side (R)` and so on; otherwise `Left Front Side`,
`Aft Left Side`, and `Left Broadsides` for WarShips). Existing valuation, caps,
arc selection, aggregates, totals and defensive-only scope SHALL remain
unchanged, and defensive-only results SHALL NOT receive ammunition terms.

#### Scenario: Pinned WarShip pools and broadsides

- **GIVEN** the pinned Bonaventure Corvette (2317) with LRM-15 launchers in the nose and aft and AC/10 launchers on both broadsides
- **WHEN** its complete large aerospace trace is calculated
- **THEN** ammo.cap SHALL equal 272 at arcs 0 and 3 (`LRM:15`) and 246 at arcs 6 and 7 (`AC:10`), and ammo.available SHALL equal 119 and 120 at the same keys
- **AND** ammo.arc SHALL equal 119 (Nose), 59.5 (Aft) and 30 each for Left and Right Broadsides, with zero for the other four arcs
- **AND** final BV SHALL remain unchanged

#### Scenario: Screen launcher cap entry

- **GIVEN** nose screen launchers whose pinned-Java cap entry is 480 (the Hamilcar 3084 value, 3 x 160)
- **WHEN** the trace is projected
- **THEN** ammo.cap at arc 0 SHALL list `SCREEN_LAUNCHER:0` as 480 with no availability and no offensive BV

### Requirement: Capital ship defensive BV dispatch

JumpShips, WarShips and Space Stations SHALL use the aerospace defensive owner
with armor factor 25, SI factor 20 and type modifiers 0.75, 0.8 and 0.7,
respectively, matching pinned MegaMek 48fcb2f6. Defensive equipment and ammo
caps SHALL use the inherited owner. KF drive and sail integrity SHALL add no
BV. Explosive penalties SHALL be zero and the defensive factor SHALL be 1.
The capital type override SHALL NOT inherit the aircraft stealth addition.

Complete scope SHALL require fully resolved mounts and represented heat,
cockpit and WarShip thrust facts. The shared final stage SHALL use G4/P5
without assigned skills; unresolved units SHALL retain defensive-only scope,
indexed mount reasons and undefined offense/final. WarShips SHALL use eight
arcs, primary candidates nose/aft/broadsides and the opposite third weighted
arc. JumpShip speed-factor MP SHALL be fixed at 1; station MP SHALL be 0.

#### Scenario: Capital defense without an invented total

- **GIVEN** Comitatus (2995), Aegis (2582) or Crucible with native defensive equipment facts but absent offensive stage facts
- **WHEN** domain or contract input reaches BV dispatch
- **THEN** defense SHALL be 2142, 12920 or 1064, respectively
- **AND** calculationScope SHALL be defensive-only with offensive and final BV undefined
- **AND** DropShip, fighter and small-craft results SHALL remain unchanged

#### Scenario: Supported capital mounts and unresolved identities

- **GIVEN** a capital unit with represented heat and stage facts
- **WHEN** all mounts resolve through the shared large-aerospace owner
- **THEN** dispatch SHALL compose offense and the shared final stage with complete scope
- **AND** any unresolved capital/sub-capital weapon, defensive qualifier or ammo quantity SHALL retain defensive-only scope with its reason

#### Scenario: Required capital defense facts

- **GIVEN** capital contract JSON without SI or armor.byArc
- **WHEN** the BV adapter runs
- **THEN** it SHALL reject the missing fact and preserve explicit zero values
- **AND** hull and broadside mounts SHALL retain their identities and locations
- **AND** all 185 pinned units SHALL be compared against the Java defensive aggregate with every miss explained by component

### Requirement: DropShip defensive BV dispatch

The unified BV dispatcher SHALL return a DropShip breakdown through the
aerospace owner. Complete scope SHALL require resolved mounts and represented
heat, thrust and cockpit facts; otherwise scope SHALL remain defensive-only
with indexed unresolved mounts and explicit reasons, and offensive/final BV
SHALL remain undefined. Complete results SHALL combine defense and offense
through the shared summary owner, apply inherited drone/cockpit modifiers,
round the base, apply shared pilot skill and round again. Absent assigned
crew skills SHALL use pinned MegaMek defaults G4/P5. With no game/force or bomb
loadout in the contract, C3, TAG and external-store bonuses SHALL be zero. It SHALL value armor at 2.5 per point,
SI at 2 per point and represented defensive equipment with the shared ammo
caps. It SHALL apply neither the small-craft armor bonus, an explosive penalty
nor a thrust multiplier. The DropShip type modifier SHALL be 1, plus the
inherited stealth armor addition when applicable.

#### Scenario: Union defensive slice without an invented total

- **GIVEN** Union (2708) with 644 armor points and SI 11 but absent heat/thrust facts
- **WHEN** contract JSON or a domain-shaped DropShip reaches BV dispatch
- **THEN** the breakdown SHALL identify its scope as defensive-only and report defense 1632
- **AND** offensive BV and final BV SHALL remain undefined with the absent facts recorded
- **AND** all existing fighter and small-craft results SHALL remain unchanged

#### Scenario: Contract defense facts are required

- **GIVEN** DropShip contract JSON without SI or armor.byArc
- **WHEN** the contract BV adapter runs
- **THEN** it SHALL reject the missing fact rather than produce a numeric result
- **AND** explicit zero SI and zero armor SHALL remain valid

#### Scenario: Complete Union and inherited final adjustments

- **GIVEN** all represented Union (2708) mounts, heat capacity 90 and maximum thrust 5
- **WHEN** contract JSON reaches BV dispatch
- **THEN** scope SHALL be complete, defense 1632, offense 2339.75 and final BV 3972
- **AND** unrepresented mounts SHALL keep other DropShips defensive-only with their identities and reasons
- **AND** base 0.5 at G0/P0 SHALL round to 1 before skill adjustment and final rounding to 2
- **AND** small and command-console cockpits SHALL apply the Aero 0.95 factor
- **AND** a represented drone final-stage input SHALL apply both inherited 0.95 factors without a third cockpit factor
- **AND** existing aerospace results SHALL remain unchanged

### Requirement: Contract vehicle BV location coverage

The contract BV adapter SHALL preserve the existing vehicle, SuperHeavy tank
and VTOL location vocabulary in armor and equipment inputs without changing
points or deriving a BV rule.

#### Scenario: Convert six-side armor and rotor equipment

- **GIVEN** converter output carrying FRONT_LEFT, FRONT_RIGHT, REAR_LEFT, REAR_RIGHT or ROTOR
- **WHEN** the contract BV adapter maps armor and equipment
- **THEN** it SHALL preserve the corresponding domain location and armor points

### Requirement: Runtime parity term validation

The comparator SHALL reject malformed runtime terms with a structured failed
result. Null and undefined entries SHALL be missing terms; other non-objects,
absent or blank field identifiers, and unknown comparison kinds SHALL be invalid
terms. An unknown comparison kind SHALL NOT silently select exact comparison.

#### Scenario: Reject JSON null and unknown comparison kinds

- **GIVEN** a term list containing JSON null or an unknown comparison kind
- **WHEN** parity is evaluated
- **THEN** the result SHALL fail and retain the entry's index in its diagnostic
- **AND** the comparator SHALL NOT throw on null or accept matching unknown-kind values

### Requirement: Strict all-family numerical parity

Every applicable numerical construction/BV result and available component term SHALL differ strictly less than 1% from its matched loaded-entity reference: `abs(actual - reference) / abs(reference) < 0.01`. Numeric acceptance SHALL compare the exact JSON decimal values so binary rounding cannot change the strict boundary; approximate ratios MAY be reported separately. Zero references SHALL require exact zero. Missing or nonfinite results SHALL fail. Discrete design facts SHALL match exactly. Existing mech BV regression gates SHALL remain enforced, but their broader aggregate thresholds SHALL NOT establish this stricter readiness.

#### Scenario: Reject the tolerance boundary

- **GIVEN** reference BV 1000
- **WHEN** local BV is 1010 or 990
- **THEN** the comparison SHALL fail without pre-rounding the relative error
- **WHEN** local BV is 1009 or 991
- **THEN** that numerical comparison SHALL pass

#### Scenario: Reject decimal boundary and missing comparison entries

- **GIVEN** reference weight 10 and actual weight 10.1 or 9.9
- **WHEN** numerical comparison runs
- **THEN** it SHALL fail at the exact decimal 1% boundary
- **AND** an array with missing comparison entries SHALL fail rather than skip them

#### Scenario: Reject missing and compensating errors

- **GIVEN** matching total weight but a failing engine or controls term
- **WHEN** numerical readiness is evaluated
- **THEN** the unit SHALL fail component parity
- **AND** zero, missing and nonfinite reference/result cases SHALL be handled explicitly

#### Scenario: Separate unsupported metrics from missing implementation

- **GIVEN** a metric unsupported by the upstream entity's rules
- **WHEN** a report marks that metric inapplicable
- **THEN** it SHALL include the upstream-supported reason
- **AND** local unimplemented calculations SHALL remain failures rather than inapplicable results

### Requirement: ProtoMech Gunnery Adjustment

ProtoMech BV SHALL use the existing shared skill table with the requested
Gunnery and fixed Piloting 5, matching pinned MegaMek's ProtoMech rule.
The optional piloting input SHALL remain accepted for API compatibility but
SHALL NOT affect ProtoMech BV. Omitted Gunnery SHALL mean 4.

#### Scenario: Gunnery-only skill and rounding

- **GIVEN** a ProtoMech with any Piloting from 0 through 8
- **WHEN** Gunnery is 0, 2, 4 or 8
- **THEN** its pilot factor SHALL be 1.75, 1.4, 1 or 0.75 respectively
- **AND** final BV SHALL round the sum of defense and offense before applying the skill factor, then round the adjusted value
- **AND** a zero base SHALL remain exactly zero
- **AND** point aggregation SHALL apply this same rule to every member

#### Scenario: Preserve saved caches until recomputation

- **GIVEN** saved movement and a cached BV using previous weight, chassis or skill adjustments
- **WHEN** hydration or identity edits occur
- **THEN** cached values and movement SHALL remain unchanged
- **WHEN** a BV-affecting edit or explicit recomputation occurs
- **THEN** the new breakdown SHALL use zero weight contribution and neutral chassis adjustment through the existing persistence contract

#### Scenario: Bounded adjustment evidence

- **WHEN** this slice is compared with pinned Java
- **THEN** actual weight/type/skill/summary methods SHALL provide the component reference and unarmed loaded synthetic units SHALL provide final-BV checks
- **AND** all 86 sources SHALL retain source fields, serialization, export bytes and unrelated component terms
- **AND** unresolved full-source BV, equipment, damage/options, implants, drones, force bonuses and production browser workflows SHALL remain explicit failures or unverified coverage

### Requirement: Offensive ammunition cap ownership

The shared, ProtoMech and aerospace offensive ammunition calculations SHALL use
one owning module for grouped accumulation and cap arithmetic. Consolidation
SHALL preserve each adapter's existing key policy, guards, operation order and
numeric output before native identity, quantity or grouping corrections.

#### Scenario: Preserving existing cap policies

- **WHEN** offensive ammunition cap mechanics are consolidated
- **THEN** shared calculations SHALL retain normalized exact/alias/Clan matching and omit zero matches
- **AND** ProtoMech SHALL retain its exact-key policy, undefined-cap guard and outer nonempty guards
- **AND** aerospace SHALL retain lowercase-only matching and omission of missing or zero caps
- **AND** duplicates, empty inputs, signed zero, negative values and nonfinite values SHALL retain their prior results
- **AND** defensive AMS and screen caps SHALL remain separate rules

#### Scenario: Preservation evidence before native changes

- **WHEN** the extracted owner replaces the three offensive implementations
- **THEN** representative output captures and all 86 pinned ProtoMech source calculations SHALL remain unchanged
- **AND** source fields, serialization and equipment identities SHALL remain unchanged
- **AND** preservation SHALL NOT establish native ammunition quantity, mount topology or full BV parity

#### Scenario: Native vehicle launcher identities retain distinct ammunition pools

- **GIVEN** a vehicle with regular, light or heavy Gauss launchers and regular Gauss ammunition
- **WHEN** the shared owner assembles offensive ammunition caps
- **THEN** original represented native launcher identities SHALL determine their type/rack pools
- **AND** regular Gauss ammunition SHALL use only the regular Gauss launchers' listed BV cap
- **AND** duplicate matching launchers SHALL accumulate before the cap, independently of mount order
- **AND** launchers without represented native identities SHALL retain the existing vehicle fallback policy
- **AND** an explicit ammunition family override SHALL take precedence over the bin's native identity
- **AND** synthetic component agreement SHALL NOT establish native quantities, defensive caps or complete source parity

#### Scenario: Mech ammunition caps use listed mounted weapon BV

- **GIVEN** a Mech weapon whose offensive BV receives an Apollo or drone modifier
- **WHEN** the offensive ammunition cap is assembled
- **THEN** the cap SHALL use the listed mounted weapon BV captured before those modifiers
- **AND** weapon-stage modifiers SHALL retain their existing values and operation order
- **AND** binding ammunition SHALL be capped at that unmodified value
- **AND** represented one-shot OS/IOS launchers SHALL supply no ammunition cap term
- **AND** a normal launcher in the same group SHALL retain its own listed-BV cap
- **AND** callers omitting separate cap inputs SHALL retain their existing policy
- **AND** unchanged totals from nonbinding source ammunition SHALL NOT establish complete ammunition parity

### Requirement: Aerospace weapon diagnostics

The ordinary aerospace calculation owners SHALL retain actual admitted
per-mount weapon values after existing link, direction, heat and support
fire-control stages. The trace SHALL format those supplied facts using local
input identity and known physical locations without recalculating BV or
inventing native equipment identities. Existing scalar arithmetic, ammo terms,
modifiers, source inputs and totals SHALL remain unchanged. Missing facts SHALL
remain absent; ammo, defensive equipment and unresolved mounts SHALL NOT create
weapon terms.

#### Scenario: Small-craft heat diagnostics preserve aggregate BV

- **GIVEN** the pinned Dragonstar Assault Transport (3060) source
- **WHEN** its ordinary aerospace breakdown is projected
- **THEN** the two aft weapon values SHALL be 31 and 15.5
- **AND** its total SHALL remain 1175 with every previous numerical field unchanged

#### Scenario: Rear mounts retain their physical location

- **GIVEN** two rear-mounted medium lasers physically installed in a fighter's left wing and one forward nose medium laser
- **WHEN** the rear group dominates without heat discounts
- **THEN** weapon terms SHALL retain two LWG values of 46 and one NOS value of 23
- **AND** the trace SHALL preserve multiplicity without treating physical ammo bins as weapons

### Requirement: Supplemental Mech ammunition diagnostic projection

The Mech owner SHALL project source-backed raw AMS/APDS, improved AC/Gauss,
fluid-gun and primitive-AC caps, and omitted native availability including
genuinely zero-valued usable coolant pods. Grouping SHALL remain in the ammo
owner and the trace SHALL format its results. Existing arithmetic inputs,
defensive ammunition calculations, pools, quantities, modifiers, diagnostic
facts and totals SHALL remain unchanged; unavailable facts SHALL remain absent.

#### Scenario: Raw defensive launcher caps and real zero-valued bins

- **GIVEN** a represented AMS mount valued at 32, an APDS mount valued at 64 or a usable physical coolant pod valued at zero
- **WHEN** the Mech breakdown and trace are calculated
- **THEN** the corresponding source-backed raw cap or availability term SHALL be present under its native type/rack key
- **AND** repeated source facts SHALL accumulate through the existing ammo owner without overwriting existing pool values
- **AND** missing, unresolved, empty or intrinsic one-shot facts SHALL NOT invent terms, and all original numerical outputs SHALL remain unchanged

### Requirement: Aerospace ammunition diagnostics

The ordinary aerospace ammo owner SHALL retain actual uncapped availability and
raw launcher caps under known native type/rack identities. The trace SHALL format
these facts without recalculating BV. Scalar arithmetic, all existing weapon
diagnostics, source inputs and totals SHALL remain unchanged. Unresolved facts
SHALL remain absent, and legacy inputs omitting ammo SHALL retain their trace.

#### Scenario: Availability exceeds the weapon cap

- **GIVEN** an SRM-2 valued at 21 BV and physical bins totaling 100 BV
- **WHEN** ordinary aerospace BV is calculated with explicit ammo
- **THEN** availability SHALL equal 100 and the raw cap SHALL equal 21
- **AND** ammo BV SHALL remain 21 before the existing support fire-control factor

#### Scenario: Independent bins and caps

- **GIVEN** unmatched bins, an explicit empty ammo list, or represented AMS launchers
- **WHEN** ordinary aerospace ammo diagnostics are projected
- **THEN** unmatched bins SHALL retain availability without inventing a cap, empty lists SHALL retain real caps without inventing bins, and AMS raw caps SHALL remain outside offensive ammo arithmetic
- **AND** direction, heat, fire control and speed SHALL NOT scale these diagnostics

### Requirement: Infantry raw weapon-stage diagnostics

The infantry BV owner SHALL supply optional primary, represented secondary,
anti-Mek repeat and remaining weapon-stage values to the trace. Their
`infantry.primaryWeaponBV`, `infantry.secondaryWeaponBV`,
`infantry.antiMekWeaponBV` and `infantry.weaponRemainderBV` projections SHALL
retain pinned native operation order and floating-point residuals without
rounding. Existing per-trooper arithmetic, old diagnostics, source inputs,
aggregates and totals SHALL remain unchanged.

#### Scenario: Native stages retain fractional residuals

- **GIVEN** pinned infantry with primary and optional secondary weapons, anti-Mek training or field guns
- **WHEN** source weapon-stage diagnostics are projected
- **THEN** primary and secondary values SHALL use the original shooter counts
- **AND** anti-Mek weapon repeats SHALL exclude archaic weapons and prosthetic bonuses
- **AND** the remainder SHALL subtract primary, secondary, field guns and anti-Mek repeats in native order, retaining even tiny nonzero residuals

#### Scenario: Missing facts, zero values and replay compatibility

- **GIVEN** a legacy calculation without source facts, an absent secondary weapon or a represented zero secondary contribution
- **WHEN** its breakdown is calculated or replayed
- **THEN** absent source facts and absent secondary weapons SHALL NOT acquire diagnostic keys
- **AND** represented zero values SHALL remain present and finite
- **AND** strict replay SHALL accept the optional finite keys and legacy payloads while rejecting nonfinite diagnostics

## MODIFIED Requirements

### Requirement: Infantry Per-Trooper BV

Source-backed infantry SHALL use pinned MegaMek 48fcb2f64 weapon BV per shooter,
not combat damage or incoming armor division (InfantryBVCalculator.java:117-158;
BVCalculator.java:805-829). Secondary shooters SHALL replace primary shooters.
Legacy editor inputs without source facts MAY retain their compatibility path.

#### Scenario: Primary weapon contribution

- **GIVEN** a source trooper with InfantryAssaultRifle, listed BV 1.59
- **WHEN** personal weapon BV is computed
- **THEN** the primary shooter SHALL contribute 1.59 before other offensive stages

#### Scenario: Secondary ratio scaling

- **GIVEN** seven troopers per squad and two secondary weapons per squad
- **WHEN** the source platoon's personal weapons are valued
- **THEN** two sevenths of shooters SHALL use secondary BV and five sevenths primary BV
- **AND** a generic weapon-table ratio SHALL NOT replace the source count

#### Scenario: Armor kit modifier

- **GIVEN** a source platoon wearing Sneak Camo
- **WHEN** BV is computed
- **THEN** the kit SHALL add no flat offensive BV
- **AND** its camouflage SHALL add 0.2 to the defensive factor

### Requirement: Infantry Platoon BV with Motive Multiplier

Source infantry SHALL sum defensive and offensive aggregates, apply the final
specialization modifier, round base BV, then apply pilot adjustment and final
rounding. Offense SHALL use the maximum run/jump/UMU MP in the shared two-decimal
speed-factor formula, not a fixed motive multiplier. Defense SHALL multiply
structure and pheromone BV by `1 + maximum TMM / 10 + stealth additions`.
Positive jumping MP SHALL add one to its TMM; zero jumping MP SHALL add none.
DEST, sneak camo and sneak IR SHALL each add 0.2; sneak ECM SHALL add 0.1.
Eligible dermal camo SHALL provide a minimum potential TMM of three (InfantryBVCalculator.java:65-113, 247-301;
BVCalculator.java:650-688, 1128-1130, 1253-1276 at the pin).

#### Scenario: Foot platoon BV

- **GIVEN** 28 unencumbered foot troopers with armor divisor one and InfantryAssaultRifle
- **WHEN** baseline source BV is computed without other equipment or specialization
- **THEN** defense SHALL equal 42 and offense SHALL equal `28 * 1.59 * 2 * 0.54 = 48.0816`
- **AND** final BV SHALL equal 90

#### Scenario: Mechanized multiplier

- **GIVEN** 20 tracked troopers with ClanKit and InfantryAssaultRifle
- **WHEN** baseline source BV is computed without other equipment or specialization
- **THEN** offense SHALL equal `20 * 1.59 * 0.77 = 24.486` and defense SHALL equal 66
- **AND** final BV SHALL equal 90

#### Scenario: Movement and stealth defense

- **GIVEN** base defense 42, run MP one, jump MP three and sneak camo/IR/ECM
- **WHEN** the defensive factor is applied
- **THEN** it SHALL equal `1 + 2 / 10 + 0.2 + 0.2 + 0.1 = 1.7`
- **AND** defense SHALL equal 71.4 without intermediate rounding

#### Scenario: Final specialization modifier

- **GIVEN** represented source specialization bits
- **WHEN** defensive and offensive BV have been summed
- **THEN** one additive modifier SHALL include 0.1 for any combat-engineer bit, 0.3 marines, 0.2 mountain, 0.1 paratroops, 0.1 SCUBA and 0.1 XCT
- **AND** multiple engineer bits SHALL count once; unrelated bits SHALL add nothing
- **AND** an explicit zero mask SHALL override implicit movement or TAG specialization

### Requirement: Infantry Anti-Mech Training Multiplier

Source infantry SHALL follow ConvInfantry.java:288-290 eligibility and repeat eligible non-archaic weapon BV, multiplying only that repeat by 1.2 for Grappler or Climbing Claws.
The legacy 1.1 training factor SHALL NOT price source infantry.

#### Scenario: Anti-mech trained platoon

- **GIVEN** eligible foot infantry with non-archaic personal weapon BV 420 before speed
- **WHEN** source offensive BV is computed
- **THEN** the personal weapon pool SHALL equal 840 before speed, without multiplying defense
- **AND** mechanized, encumbered or active-field-weapon infantry SHALL receive no repeat

### Requirement: Infantry Field Gun BV Addition

Source field guns SHALL use the existing equipment resolver for actual weapon/ammo mounts, native quantities and excessive-ammo caps.
Their BV SHALL receive offensive speed, then final specialization and pilot adjustment.

#### Scenario: AC/5 field gun

- **GIVEN** a foot platoon crewing an AC/5 with a standard 20-shot ammunition bin
- **WHEN** its field-gun contribution is computed at offensive speed factor 0.54
- **THEN** it SHALL contribute `(70 + 9) * 0.54 = 42.66` before final modifiers
- **AND** the source gun and ammo SHALL each be counted once

### Requirement: Aerospace BV Dispatch

The BV calculator SHALL route `IAerospaceUnit` inputs to an aerospace-specific
calculation path. Conventional fighters and FixedWingSupport SHALL use the sum
of defensive and offensive BV before pilot adjustment, without a final 0.8
subtype multiplier, matching pinned MegaMek `AeroBVCalculator.processSummarize`
and `BVCalculator.processSummarize`.

#### Scenario: ASF dispatch

- **GIVEN** an aerospace fighter
- **WHEN** `calculateBattleValue` is called
- **THEN** the aerospace calculator SHALL be invoked
- **AND** the return SHALL include an `IAerospaceBVBreakdown`

#### Scenario: Conventional fighter multiplier

- **GIVEN** a conventional fighter or FixedWingSupport
- **WHEN** final BV is computed
- **THEN** `(defensive + offensive)` SHALL receive pilot adjustment and rounding without a final subtype reduction
- **AND** the compatibility breakdown field `subTypeMultiplier` SHALL equal 1

#### Scenario: Boeing final BV

- **GIVEN** Boeing Jump Bomber with defensive BV 63.8 and offensive BV zero
- **WHEN** final BV is computed for the baseline pilot
- **THEN** final BV SHALL equal 64, matching pinned Java

### Requirement: Vehicle Defensive BV

Vehicle defensive BV SHALL combine armor, structure and defensive equipment,
subtract explosive penalties, apply the motion-type modifier to that entire
pool, then apply the separate motive-type TMM factor. The motion multiplier
SHALL be 0.9 tracked, 0.8 wheeled, 0.7 hover/VTOL/WiGE and 0.6 otherwise.
Non-support vehicles SHALL add 0.2 per fully amphibious mount or 0.1 per
limited amphibious, dune buggy, flotation hull, environmental sealing or
armored motive mount. Support vehicles SHALL omit these equipment additions.

#### Scenario: Defensive BV formula

- **WHEN** computing vehicle defensive BV
- **THEN** base defensive BV SHALL equal `armor × 2.5 × armorMult + structure × 1.5 × structureMult + defEquipBV − explosivePenalty`
- **AND** the defensive factor SHALL equal `1 + max(running TMM, jumping TMM, 0) / 10` without intermediate rounding
- **AND** final defensive BV SHALL equal `base × type modifier × defensive factor`

#### Scenario: VTOL TMM bonus

- **GIVEN** a VTOL with flank MP 15
- **WHEN** TMM is computed
- **THEN** the TMM SHALL equal the 15-MP table value + 1 (altitude bonus)

#### Scenario: BAR armor scaling

- **GIVEN** a BAR-6 support vehicle with 40 armor points
- **WHEN** armor BV is computed
- **THEN** armor BV SHALL equal `40 × 2.5 × 1.0 × (6/10) = 60`

#### Scenario: Preserve vehicle armor valuation facts

- **GIVEN** uniform or patchwork vehicle armor, including installed turret and rotor locations
- **WHEN** the contract adapter and dispatcher compute armor BV
- **THEN** native numeric and named armor types SHALL use pinned MegaMek's multipliers: hardened 2; reactive, reflective and ballistic-reinforced 1.5; ferro-lamellor and anti-penetrative ablation 1.2; heat-dissipating 1.1; other types 1
- **AND** patchwork SHALL sum each location's nonnegative points times its multiplier times BAR/10, then multiply by 2.5 without intermediate rounding
- **AND** missing patchwork location types SHALL fail explicitly
- **AND** Blue Shield SHALL add 0.2 before location HarJel II/III factors of 1.1/1.2, with each undamaged modular-armor mount adding 10 points
- **AND** the converter SHALL preserve installed patchwork type codes and support BAR ratings
- **AND** uniform support armor with no source BAR rating SHALL retain Java's zero default, so Air Car's armor BV SHALL be zero

#### Scenario: Reflective and hardened corpus armor

- **GIVEN** Mamono IFV's 160 reflective armor points and Ballista Artillery Trailer's 152 hardened armor points
- **WHEN** their armor is valued through the contract dispatcher
- **THEN** their armor BV SHALL equal 600 and 760 respectively
- **AND** unrelated offensive, structure, equipment and movement fields SHALL retain their existing rules

#### Scenario: Chassis equipment and support exclusion

- **GIVEN** a tracked vehicle with fully amphibious and armored motive mounts
- **WHEN** the defensive type modifier is computed
- **THEN** it SHALL equal `0.9 + 0.2 + 0.1 = 1.2` without clamping
- **AND** a support vehicle with the same mounts SHALL retain 0.9
- **AND** a store sealing or flotation flag and its matching mount SHALL count once

#### Scenario: Tamerlane isolated defensive type term

- **GIVEN** Tamerlane (Flamer) with armor BV 120, corrected structure BV 15 and corrected TMM factor 1.5
- **WHEN** the hover type modifier is applied
- **THEN** defense SHALL equal `(120 + 15) × 0.7 × 1.5 = 141.75`
- **AND** applying the type modifier SHALL preserve armor, structure, equipment and offensive breakdown fields
- **AND** every Tank, SuperHeavyTank and VTOL oracle row SHALL be compared before and after, with every away-moving row explained
- **AND** this single-stage correction SHALL NOT establish complete vehicle BV parity

#### Scenario: Installed-location vehicle structure

- **GIVEN** a Tank, SuperHeavyTank, VTOL or support vehicle
- **WHEN** its construction structure BV is computed
- **THEN** each installed non-body location SHALL contribute `ceil(tonnage / 10)` internal points, including zero-armor turrets and the VTOL rotor
- **AND** the hull SHALL have four locations, or six for a SuperHeavyTank or LargeSupportTank, plus installed turrets and the VTOL rotor
- **AND** structure BV SHALL equal total internal points times 1.5 times the type multiplier: industrial/composite 0.5, reinforced 2, otherwise 1
- **AND** installed Blue Shield SHALL add 0.2 to the structure multiplier
- **AND** source layout and numeric structure type SHALL survive handler and contract adaptation
- **AND** every one of the 1,419 vehicle oracle rows SHALL be compared before and after, preserving unrelated output fields and explaining every total that moves farther from Java

#### Scenario: Vehicle running, airborne and jumping TMM

- **GIVEN** assembled flank MP and jump MP for a combat or support vehicle
- **WHEN** defensive TMM is computed using the shared standard movement brackets
- **THEN** running TMM SHALL use flank MP, without substituting cruise or submarine depth MP
- **AND** positive running MP SHALL add exactly one for VTOL or WiGE; zero running MP SHALL return zero
- **AND** positive jump MP SHALL add one to its own bracket value; zero jump MP SHALL return zero
- **AND** represented uniform stealth SHALL add two to each nonzero movement mode before taking the maximum
- **AND** defense SHALL retain fractional precision until the existing final BV rounding
- **AND** all 1,419 combat and support oracle rows SHALL be compared before and after, with every away-moving row explained
- **AND** fields other than TMM, defensive factor, defense and final SHALL remain exactly equal
- **AND** these rules SHALL apply only to the vehicle defensive BV path; the public `calculateVehicleTMM` compatibility helper SHALL preserve its effective-MP/submarine overrides, unconditional VTOL running bonus and positive-only jump guard

### Requirement: Aerospace Defensive BV

Aerospace defensive BV SHALL use Structural Integrity in place of the mech gyro term,
valued at twice the input SI for aerospace fighters, conventional fighters,
FixedWingSupport and small craft, independently of tonnage, matching pinned
MegaMek `AeroBVCalculator.processStructure`. Blue Shield valuation is deferred
until the BV input can express its working state.
It SHALL apply no thrust-based multiplier to the defensive pool, matching pinned
MegaMek `AeroBVCalculator.processDefensiveFactor`. The exposed `defensiveFactor`
SHALL equal 1 for aerospace fighters, conventional fighters, FixedWingSupport and
small craft. After armor, SI, defensive equipment and explosive penalties, the
defensive pool SHALL be multiplied by 1.2 for aerospace fighters, 1.1 for
conventional fighters, and 1 for support vehicles (including FixedWingSupport)
and small craft. Non-patchwork stealth armor SHALL add 0.3 to that modifier;
patchwork armor SHALL receive no stealth bonus. This type stage SHALL precede
the neutral defensive factor and SHALL NOT scale offensive BV.
Represented mounted defensive equipment SHALL contribute its resolved BV once
per mount before the type stage and SHALL be excluded from offensive arc pools
and ammunition weapon caps. ECM, active probes, AMS, defensive pods and the
represented miscellaneous identities flagged defensive by pinned Java SHALL
use this rule. Represented AMS ammunition SHALL be capped at installed
ammunition-using AMS BV; laser AMS SHALL NOT increase that cap. Unsupported
native identities, quantities and variable equipment BV remain explicit gaps.

#### Scenario: Saroyan defensive equipment

- **GIVEN** Saroyan Jump Bomber with armor BV 60, SI BV 16, stealth and Guardian ECM BV 61
- **WHEN** its contract passes through BV dispatch
- **THEN** defense SHALL equal `(60 + 16 + 61) × 1.4 = 191.8`
- **AND** its ECM SHALL contribute zero offensive BV
- **AND** its baseline pilot final BV SHALL equal 192, matching pinned Java

#### Scenario: Defensive ammunition caps

- **GIVEN** one 32 BV AMS and four represented 11 BV ammunition bins
- **WHEN** defensive equipment BV is computed
- **THEN** it SHALL equal `32 + min(32, 44) = 64`
- **AND** orphan ammunition SHALL contribute zero
- **AND** laser AMS SHALL contribute its own BV without supporting ammunition

#### Scenario: Bounded equipment and final-sum evidence

- **WHEN** these terms are checked against pinned Java
- **THEN** all 620 aerospace oracle rows SHALL be compared before and after by family
- **AND** every farther-moving row SHALL be explained
- **AND** unrelated breakdown fields SHALL remain identical
- **AND** these corrections SHALL NOT establish complete aerospace BV parity

#### Scenario: SI BV

- **GIVEN** a 50-ton ASF with SI 5
- **WHEN** SI BV is computed
- **THEN** siBV SHALL equal `5 × 2 = 10`

#### Scenario: Fighter SI contributions

- **GIVEN** Boeing Jump Bomber with SI 9 and Sabre SB-27b-EC with SI 11
- **WHEN** their defensive BV is computed
- **THEN** their SI contributions SHALL equal 18 and 22 respectively
- **AND** this term SHALL NOT imply parity with their Java totals of 64 and 987

#### Scenario: Support aircraft and small craft share SI valuation

- **GIVEN** Mosquito Light Fighter or Dragonstar Assault Transport (3060) with SI 6
- **WHEN** its defensive BV is computed
- **THEN** its SI contribution SHALL equal 12
- **AND** changing tonnage alone SHALL NOT change the SI contribution

#### Scenario: Boeing defensive pool

- **GIVEN** Boeing Jump Bomber with safe thrust 9 and maximum thrust 14
- **WHEN** its defensive BV is computed
- **THEN** the defensive factor SHALL equal 1
- **AND** armor BV 40 plus SI BV 18 SHALL produce a pool of 58 before the type stage
- **AND** the type modifier 1.1 SHALL produce defensive BV 63.8
- **AND** this term correction SHALL NOT imply total BV parity with Java's 64

#### Scenario: Defensive factor uses Max Thrust

- **GIVEN** an ASF with maxThrust 9
- **WHEN** defensive factor is computed
- **THEN** defensiveFactor SHALL equal 1 regardless of maximum thrust
- **AND** the separate aircraft type modifier SHALL equal 1.2 with standard armor

#### Scenario: Sabre aircraft type contribution

- **GIVEN** Sabre SB-27b-EC with armor BV 267.5 and SI BV 22
- **WHEN** its defensive BV is computed
- **THEN** defense SHALL equal `(267.5 + 22) × 1.2 = 347.4`
- **AND** this defensive agreement SHALL NOT imply total parity with Java's 987

#### Scenario: FixedWingSupport classification takes precedence

- **GIVEN** a conventional-fighter contract with subType FixedWingSupport
- **WHEN** it passes through the BV adapters
- **THEN** its support-vehicle identity SHALL reach the defensive calculation
- **AND** it SHALL receive the type modifier 1 instead of 1.1

#### Scenario: Stealth adds to the aircraft modifier

- **GIVEN** non-patchwork stealth armor on an ASF, conventional fighter, support aircraft or small craft
- **WHEN** its defensive type modifier is applied
- **THEN** the modifiers SHALL equal 1.5, 1.4, 1.3 and 1.3 respectively
- **AND** the modifier SHALL apply after defensive equipment and explosive penalties
- **AND** patchwork SHALL retain the base type modifier without a stealth bonus

#### Scenario: Preserve native vehicle stealth armor on aircraft

- **GIVEN** an aircraft BLK with native armor code 22 (vehicle stealth)
- **WHEN** its armor is converted to the unit contract
- **THEN** armor.type SHALL be STEALTH, as for native code 8
- **AND** Saroyan Jump Bomber's armor BV 60 and SI BV 16 SHALL contribute `(60 + 16) × 1.4 = 106.4` before additional defensive equipment

#### Scenario: Thrust does not scale defense

- **GIVEN** otherwise identical defensive inputs for each supported aerospace subtype
- **WHEN** maximum thrust changes
- **THEN** the defensive pool SHALL remain unchanged
- **AND** armor, SI, equipment, explosive penalties and offensive terms SHALL retain their existing rules

### Requirement: ProtoMech Offensive BV and Main Gun

Proto offensive BV SHALL include arm weapons and a MainGun location weapon
with the same BV as a mech-mounted instance. Its offensive movement factor
SHALL use explicit Run plus rounded half of nonnegative Jump, using the shared
speed-factor owner and the pinned MegaMek calculator's UMU-zero context.
The offensive pool SHALL NOT add tonnage or a generic physical-attack bonus.

#### Scenario: No weight-only offense

- **GIVEN** a ProtoMech without offensive equipment
- **WHEN** its BV is calculated for any supported chassis or tonnage
- **THEN** physicalWeaponBV and offensiveBV SHALL both be exactly zero
- **AND** changing tonnage alone SHALL NOT change its offensive pool

#### Scenario: Main gun BV at full value

- **GIVEN** a proto with a main-gun PPC (catalog BV 176)
- **WHEN** offensive BV is computed
- **THEN** the main gun contribution SHALL equal 176 BV (no proto-specific modifier)

#### Scenario: Proto speed factor

- **GIVEN** a proto with Walk 6, Run 9 and Jump 4
- **WHEN** offensive speed factor is computed
- **THEN** effective MP SHALL be `9 + round(4 / 2) = 11` and the factor SHALL equal 1.76
- **AND** the calculator SHALL consume explicit Run without changing or reconstructing movement from Walk or a booster flag
- **AND** negative Jump SHALL contribute zero, matching the shared movement owner

#### Scenario: Reactive and saved movement

- **WHEN** a new store or a BV-affecting edit computes a breakdown
- **THEN** its offensive factor SHALL use the current stored Run and Jump
- **GIVEN** saved movement and a cached breakdown from an earlier version
- **WHEN** the store hydrates or only identity fields change
- **THEN** neither saved movement nor cached BV SHALL be silently migrated
- **WHEN** recomputation is explicitly requested
- **THEN** the factor SHALL be refreshed from the preserved movement values

#### Scenario: Component evidence and exclusions

- **WHEN** the movement factor is compared to pinned Java
- **THEN** the 86 loaded sources and bounded synthetic components/entities SHALL compare matching Run and Jump under undamaged BV settings
- **AND** source fields, export bytes and unrelated BV components SHALL be checked separately from changed speed, offensive subtotal and total values
- **AND** equipment pools, damage/options, complete BV and production editor/save flows SHALL remain unverified until independently proven

### Requirement: ProtoMech Defensive BV

The proto defensive BV SHALL combine armor, structure, defensive equipment,
explosive penalty and the pinned MegaMek default-construction defensive movement
factor. Explosive equipment SHALL NOT subtract a ProtoMech-specific penalty;
the compatibility explosivePenalty field SHALL remain exactly zero. A Glider
SHALL add one to running TMM before comparison with jumping
TMM, including zero Run. Every ProtoMech SHALL add 0.1 to the inherited factor.

#### Scenario: Armor BV baseline

- **GIVEN** a Medium proto with 20 armor points
- **WHEN** armorBV is computed
- **THEN** armorBV SHALL equal `20 × 2.5 × 1.0 = 50`

#### Scenario: Structure BV baseline

- **GIVEN** a Medium proto with 12 structure points
- **WHEN** structureBV is computed
- **THEN** structureBV SHALL equal `12 × 1.5 × 1.0 = 18`

#### Scenario: Native defensive movement factors

- **GIVEN** nonnegative integer Run and Jump, UMU zero and standard movement modifiers
- **WHEN** the defensive factor is computed
- **THEN** it SHALL equal `(1 + max(running TMM, jumping TMM) / 10) + 0.1` in that operation order
- **AND** Glider running TMM SHALL include its one-point bonus before the maximum is taken
- **AND** Biped, Quad and the local Ultraheavy enum SHALL receive no Glider bonus
- **AND** jumping TMM SHALL be zero at Jump zero and otherwise include the standard one-point jump bonus
- **AND** the existing defensive pool SHALL be multiplied by that factor without changing source movement or inferring Run from Walk or equipment

#### Scenario: Reactive and saved defensive BV

- **WHEN** new state or a BV-affecting edit computes a breakdown
- **THEN** the defensive factor SHALL use current chassis and explicit stored movement
- **GIVEN** a saved cached breakdown and movement from an earlier version
- **WHEN** hydration or unrelated identity edits occur
- **THEN** saved movement and cached BV SHALL remain unchanged
- **WHEN** explicit recomputation or a BV-affecting edit occurs
- **THEN** the factor SHALL be refreshed and persisted through the existing store contract

#### Scenario: Independent component verification

- **WHEN** defensive movement is checked against pinned Java
- **THEN** component TMMs, the factor and its application SHALL be checked across boundaries, loaded synthetic entities and all 86 sources
- **AND** unrelated family outputs, source fields, serialization and export bytes SHALL be preserved
- **AND** fractional/nonfinite/negative movement, MaxTech options, full equipment pools, complete BV and production browser flows SHALL remain outside this component proof

#### Scenario: Native ProtoMech explosive stage

- **GIVEN** a ProtoMech carrying Gauss or other explosive equipment
- **WHEN** defensive BV is calculated
- **THEN** explosivePenalty SHALL be exactly zero, matching the inherited empty native stage
- **AND** equipment identities, other BV terms and source/export data SHALL be preserved
- **AND** a zero defensive pool SHALL remain exactly zero
- **AND** saved cached BV SHALL remain unchanged until an existing BV-affecting action or explicit recomputation
- **AND** native explosive-stage agreement SHALL NOT establish ammunition, equipment-pool or complete BV parity

#### Scenario: Shared thresholds preserve legacy validation

- **WHEN** standard TMM thresholds are consolidated
- **THEN** the validation BV helper SHALL use the shared upper-bound lookup on the greater of raw Run and Jump, without adding the construction jump bonus
- **AND** Run zero with Jump three SHALL remain TMM one and defensive speed factor 1.1
- **AND** either input being NaN SHALL retain TMM six and defensive speed factor 1.6
- **AND** negative, fractional, infinite and signed-zero inputs SHALL retain their prior results
- **AND** construction and gameplay SHALL preserve their distinct guards and interval conventions

#### Scenario: Shared thresholds preserve the BV validation adapter

- **GIVEN** the active `validate:bv` adapter selecting defensive calculator inputs
- **WHEN** standard TMM thresholds and their inverse bracket minima are consolidated
- **THEN** it SHALL consume the movement owner for both lookups
- **AND** it SHALL preserve the greater of Jump and UMU with a bonus only when that maximum is positive, then compare against running TMM
- **AND** its returned TMM and representative Run SHALL remain unchanged for boundaries, fractional, negative, signed-zero and nonfinite inputs, including TMM seven mapping to the final standard bracket minimum

### Requirement: ProtoMech Chassis Multiplier

ProtoMech final BV SHALL NOT receive a generic chassis multiplier. The public
chassis multiplier and breakdown field SHALL remain neutral compatibility
outputs of 1. Chassis-specific structure, armor and defensive movement SHALL
continue through their owning calculations.

#### Scenario: Glider and Ultraheavy summary

- **GIVEN** a Glider with rounded base BV 280 or a local Ultraheavy with rounded base BV 600
- **WHEN** baseline-skill final BV is calculated
- **THEN** final BV SHALL remain 280 or 600 respectively
- **AND** Biped and Quad SHALL also use the neutral summary multiplier

### Requirement: Aerospace Offensive BV Arc Fire Pool

Aerospace offensive BV SHALL use forward/rear groups for fighters, support aircraft and small craft.
Nose, wing/side and Fuselage mounts form one forward BV group and Aft mounts
form the rear group. The larger group SHALL contribute at 100%
and the smaller at 50%; a tie SHALL keep forward at 100%. Per-arc raw values
and the separate Fuselage subtotal SHALL remain available. Arc weighting
SHALL preserve the independently defined heat, ammo, equipment classification
and speed rules.

#### Scenario: Primary arc contributes 100%

- **GIVEN** an ASF whose Nose arc holds the highest-BV weapon pool and whose forward group exceeds Aft
- **WHEN** offensive BV is computed
- **THEN** Nose, LeftWing, RightWing and Fuselage SHALL contribute at 100%
- **AND** Aft SHALL contribute at 50%

#### Scenario: Primary arc not Nose

- **GIVEN** an ASF whose LeftWing arc has higher BV than Nose and whose combined forward group exceeds Aft
- **WHEN** fire-pool weighting is applied
- **THEN** LeftWing, RightWing, Nose and Fuselage SHALL contribute at 100%
- **AND** Aft SHALL contribute at 50%
- **AND** primaryArc SHALL identify the highest-BV populated arc in the dominant group

#### Scenario: Rear group is stronger

- **GIVEN** Aft BV greater than the sum of all forward arcs including Fuselage
- **WHEN** offensive BV is computed
- **THEN** Aft SHALL contribute at 100% and every forward arc at 50%
- **AND** primaryArc SHALL be Aft

#### Scenario: Tied or empty groups

- **GIVEN** equal forward and rear BV
- **WHEN** group weights are selected
- **THEN** forward SHALL retain 100% and Aft 50%
- **AND** when both groups are zero, primaryArc SHALL be null and all contribution weights zero

#### Scenario: Sabre native prototype mount facts

- **GIVEN** Sabre SB-27b-EC with four native prototype lasers of 62 BV, two per wing
- **WHEN** those weapon facts are supplied at the catalog boundary
- **THEN** the forward pool SHALL equal 248 BV
- **AND** at the max-thrust speed factor 2.58, offensive BV SHALL equal 639.84
- **AND** unresolved production catalog IDs SHALL remain a separate parity gap

### Requirement: Aerospace Speed Factor

Aerospace speed factor SHALL use maximum thrust (airborne run MP) for ASF,
conventional fighters, fixed-wing support and small craft. The existing
max-thrust owner SHALL derive this input as `ceil(safeThrust * 1.5)`.
The shared speed-factor owner SHALL apply
`round(pow(1 + (maxThrust - 5) / 10, 1.2) * 100) / 100`.
The public `avgThrust` field SHALL retain the arithmetic mean for compatibility
without affecting speed. Defense, arc pools, ammo and pilot modifiers SHALL
remain independent of this speed-input correction.

#### Scenario: Speed factor calculation

- **GIVEN** an ASF with safeThrust 5, maxThrust 8
- **WHEN** speed factor is computed
- **THEN** avgThrust SHALL equal 6.5
- **AND** speed factor SHALL equal 1.37 using maximum thrust 8

#### Scenario: Legacy maximum thrust input

- **GIVEN** an ASF with safeThrust 5 and supplied maxThrust 7
- **WHEN** speed factor is computed
- **THEN** avgThrust SHALL equal 6 and speed factor SHALL equal 1.24

#### Scenario: Sabre and conventional fighter speed

- **GIVEN** Sabre safe/max thrust 11/17 and a native forward pool of 248 BV
- **WHEN** offensive BV is computed
- **THEN** speed factor SHALL equal 2.58 and offense SHALL equal 639.84
- **AND** a conventional fighter with thrust 5/8 SHALL use speed factor 1.37

#### Scenario: Upward-rounded and zero thrust

- **GIVEN** any supported family with safe thrust 3 or 0
- **WHEN** maximum thrust is derived and speed is computed
- **THEN** max thrust SHALL equal 5 or 0, with speed factor 1 or 0.44 respectively

### Requirement: Vehicle Offensive BV

Vehicle offensive BV SHALL combine weapon BV, ammo BV, offensive equipment BV,
mount modifiers and half the unit's raw tonnage before applying the speed
factor. The mass contribution SHALL apply to Tank, SuperHeavyTank, VTOL and
support vehicles, including unarmed vehicles, without rounding the tonnage.
Single, Dual, Chin and Sponson turret weapons SHALL
retain their listed BV before other applicable modifiers and SHALL NOT receive
a rotating-turret bonus. The consumed `turretModifier` breakdown field SHALL
remain available and equal 1 for these turret kinds.

#### Scenario: Ordinary turret weapons

- **GIVEN** a Single, Dual or Chin turret containing 100 BV of weapons
- **WHEN** offensive BV is computed without other weapon modifiers
- **THEN** the turret weapons SHALL contribute 100 BV before the speed factor

#### Scenario: Rear-arc weapon penalty

- **GIVEN** a combat vehicle with a rear-mounted AC/10 (no turret)
- **WHEN** offensive BV is computed
- **THEN** the rear-only weapon BV SHALL be multiplied by 0.5

#### Scenario: Turret weapons avoid the rear penalty

- **GIVEN** a turret-mounted weapon also carrying a rear-mounted flag
- **WHEN** offensive BV is computed
- **THEN** it SHALL receive neither the 0.5 rear penalty nor a turret bonus

#### Scenario: Sponson weapons retain listed BV

- **GIVEN** a sponson-mounted weapon containing 100 BV
- **WHEN** offensive BV is computed without other weapon modifiers
- **THEN** it SHALL contribute 100 BV and turretModifier SHALL equal 1

#### Scenario: Bound the parity claim

- **WHEN** this turret term is checked against pinned MegaMek 48fcb2f6
- **THEN** every Tank, SuperHeavyTank and VTOL oracle row SHALL be compared before and after
- **AND** units moving away SHALL be listed with their component differences
- **AND** correcting this term SHALL NOT establish complete vehicle BV parity

#### Scenario: Tamerlane offensive mass contribution

- **GIVEN** the 20-ton Tamerlane Strike Sled (Flamer) with weapon BV 98, no ammunition or offensive equipment BV and speed factor 2.72
- **WHEN** offensive BV is computed
- **THEN** it SHALL equal `(98 + 20 / 2) × 2.72 = 293.76`, matching pinned MegaMek
- **AND** the existing defensive terms SHALL remain unchanged

#### Scenario: Unarmed VTOL and fractional support mass

- **GIVEN** the unarmed 5-ton Ferret Light Scout VTOL (Cargo) with speed factor 3.44
- **WHEN** offensive BV is computed
- **THEN** it SHALL equal `5 / 2 × 3.44 = 8.6`
- **GIVEN** a 0.06-ton support vehicle without weapons and with speed factor 1
- **WHEN** offensive BV is computed
- **THEN** it SHALL equal 0.03 regardless of its BAR rating

#### Scenario: Isolate mass parity evidence

- **WHEN** the mass contribution is checked against pinned MegaMek 48fcb2f6
- **THEN** every Tank, SuperHeavyTank, VTOL, SupportTank and SupportVTOL oracle row emitted by the converter SHALL be compared before and after
- **AND** defense, weapon BV, ammo BV, offensive equipment BV, mount modifiers, speed factor and pilot multiplier SHALL remain unchanged
- **AND** every unit moving away SHALL be explained with its component values
- **AND** the mass correction SHALL NOT establish complete vehicle BV parity

#### Scenario: Project existing vehicle weapon mount results

- **GIVEN** the pinned Tamerlane Flamer and rocket-launcher variants
- **WHEN** the existing offensive owner results are projected before the speed factor
- **THEN** the front Flamer SHALL expose 6 BV, each front RL10 SHALL expose 18 BV, and each rear RL10 SHALL expose 9 BV
- **AND** duplicate mounts SHALL remain separate, with comparison using the existing per-location count and sorted-value contract
- **AND** trace indices and equipment IDs SHALL remain local identities, with known native location abbreviations
- **AND** source-name aliases and canonical catalog IDs SHALL yield identical diagnostic mount identities through the catalog owner
- **AND** existing totals, aggregates, ammunition, loads and construction validity SHALL remain unchanged
- **AND** unknown locations and absent diagnostic snapshots SHALL NOT acquire invented native identities

### Requirement: Per-Trooper Defensive BV

BA defensive BV SHALL apply the pinned MegaMek armor/internal and movement
factor per trooper: `(1 + max(0, armor) * rate + systems) * factor`. The armor
rate SHALL be 3.5 for reactive, reflective or fire-resistant armor and 2.5
otherwise. `systems` SHALL follow BattleArmorBVCalculator.java:280-326: 1 for
improved sensors, 1 for another active probe, 1 for the first ECM (2 when it
is an Angel ECM), plus AMS BV, whole for squad mounts and divided by the
squad size otherwise. AMS SHALL NOT count as offense.
The factor SHALL be `1 + max(runTMM, jumpTMM, umuTMM)/10 + 0.1 + stealth + camo`.
Improved stealth and mimetic armor SHALL add 0.3, other stealth SHALL add 0.2,
and camouflage SHALL independently add 0.2. Clamps and weight class SHALL NOT
add defensive BV. TMMs SHALL use the BV movement of Per-Trooper Offensive BV.

#### Scenario: Armor BV with Standard armor

- **GIVEN** a trooper with 5 points Standard BA armor
- **WHEN** defensive BV is computed
- **THEN** armorBV SHALL include the internal point and equal `1 + 5 * 2.5 = 13.5`

#### Scenario: Stealth armor multiplier

- **GIVEN** a trooper with 5 points Basic Stealth BA armor and no movement TMM
- **WHEN** defensive BV is computed
- **THEN** armorBV SHALL equal 13.5 and the defensive factor SHALL equal 1.3

#### Scenario: Magnetic Clamp anti-mech bonus

- **GIVEN** a trooper equipped with Magnetic Clamps
- **WHEN** defensive BV is computed
- **THEN** clamps SHALL add zero defensive BV

#### Scenario: Move BV by class

- **GIVEN** a Medium-class trooper with ground MP 2 and 5 Standard armor points
- **WHEN** defensive BV is computed
- **THEN** defense SHALL equal `13.5 * 1.1 = 14.85`
- **AND** changing weight class alone SHALL NOT change this defensive value

#### Scenario: Defensive systems precede the factor

- **GIVEN** a 4-trooper squad with 6 improved stealth armor points, jump 3, improved sensors and a BA ECM
- **WHEN** defensive BV is computed
- **THEN** defensive equipment SHALL equal 2 and defense SHALL equal `(16 + 2) * 1.6 = 28.8`

### Requirement: Squad-Scale BV

BA BV SHALL sum the troopers' unrounded BV, divide by shooting strength,
and multiply by `(0.9 + 0.1 * strength) * strength`, following pinned MegaMek
48fcb2f64 BattleArmorBVCalculator.java:193-204. Homogeneous squads SHALL apply
that factor to per-trooper BV. Pilot skill SHALL apply afterwards, and only the
final result SHALL be rounded to an integer.

#### Scenario: Clan 5-trooper squad

- **GIVEN** a Clan squad with trooperBV = 100 and squadSize = 5
- **WHEN** squad BV is computed
- **THEN** squadBV SHALL equal `100 * 7 = 700` before pilot skill

#### Scenario: IS 4-trooper squad

- **GIVEN** an IS squad with trooperBV = 80 and squadSize = 4
- **WHEN** squad BV is computed
- **THEN** squadBV SHALL equal `80 * 5.2 = 416` before pilot skill

#### Scenario: Singleton and unrounded strength scaling

- **GIVEN** a one-trooper design with BV 10.25 or a six-trooper design with BV 10.25 per trooper
- **WHEN** squad BV is computed with baseline skill
- **THEN** unrounded squadBV SHALL equal 10.25 or 92.25 and final BV SHALL equal 10 or 92

### Requirement: Per-Trooper Offensive BV

BA offensive BV SHALL use the existing equipment-id resolver after decoding
native physical mount qualifiers. Shared weapons SHALL contribute per trooper;
squad-support weapons SHALL divide by shooting strength, and trooper-specific
mounts SHALL contribute only to their bearer. Anti-Mek-capable suits SHALL
count eligible non-missile, non-infantry, non-body weapons a second time and
count vibro/magnetic claws only in the anti-Mek pool. Heavy/assault, quad,
underwater and burdened suits SHALL NOT receive anti-Mek offense; a
body-mounted BA rocket launcher (a one-shot missile with linked ammo) SHALL
burden an Inner Sphere suit. Equipment with BV that is not a weapon SHALL add
offense only for the trooper whose location carries it, averaged over the
squad (BattleArmorBVCalculator.java:223-226). The pool
SHALL use the shared offensive speed factor with MP equal to maximum walk,
jump or active UMU. Walk, jump and UMU MP for BV (offense and defensive TMM)
SHALL follow BattleArmor.java:446-567 without DWP or burden: a myomer booster
adds 2 walk (1 at heavy or assault), otherwise a mechanical jump booster adds
1; UMU suits SHALL have no jump MP and SHALL use their jumping MP as UMU MP;
a mechanical jump booster SHALL give 1 jump without jump jets; with jump MP, a
partial wing and a jump booster SHALL each add 1. BA ammunition SHALL be
valued per shot, `kgPerShot * shots / 1000 * BV per ton`, for every trooper
when squad-mounted and for its trooper otherwise;
it SHALL count only in the pool of a launcher with the same Java
ammoType:rackSize, capped at that launcher BV, and one-shot launchers SHALL
NOT form a pool. Unsupported identities and native ammunition lacking
kgPerShot SHALL remain explicitly unresolved, not invented ton bins.

#### Scenario: Manipulator melee BV

- **GIVEN** an anti-Mek-capable trooper with two vibro claws worth 1 BV each
- **WHEN** offensive BV is computed
- **THEN** claws SHALL contribute 2 BV before the offensive speed factor
- **AND** ordinary battle claws SHALL contribute zero BV

#### Scenario: Weapon BV identical to catalog

- **GIVEN** a trooper with an SRM-2 valued at catalog BV 21 and effective MP 5
- **WHEN** offensive BV is computed without ammo
- **THEN** weaponBV SHALL equal 21 and missile weapons SHALL receive no anti-Mek duplication

#### Scenario: Achileus David source and physical mount

- **GIVEN** the pinned four-trooper Achileus David source with a 7 BV arm-mounted Gauss rifle, basic manipulators and effective MP 3
- **WHEN** both shared dispatch and handler compute BV
- **THEN** offense SHALL equal `14 * 0.77 = 10.78` per trooper and final BV SHALL equal 189
- **AND** body-mounting that weapon SHALL remove anti-Mek duplication

#### Scenario: Unresolved native ammunition

- **GIVEN** a native ammunition mount whose catalog lacks per-shot mass
- **WHEN** native mount values are projected
- **THEN** its identity and missing kgPerShot SHALL be reported and no one-ton BV SHALL be invented

#### Scenario: Per-shot BA ammunition

- **GIVEN** the pinned four-trooper Cavalier [SRM] source with an SRM-1 launcher and four BA SRM-1 shots
- **WHEN** BV is computed
- **THEN** ammo BV SHALL equal `10 * 4 / 1000 * 2 = 0.08` per trooper and final BV SHALL equal 219

#### Scenario: Partial wing raises BV movement

- **GIVEN** the pinned four-trooper Kage Light (Vibro-Claw) source with walk 1, jump 3, a partial wing and two vibro claws
- **WHEN** BV is computed
- **THEN** jump MP SHALL be 4, offense SHALL equal `2 * 0.88 = 1.76` per trooper and final BV SHALL equal 114

### Requirement: Vehicle ammunition diagnostic projection

The vehicle owner SHALL transport its admitted uncapped native ammunition and
raw weapon-cap pools from the shared ammunition owner. The trace SHALL format
these facts as `ammo.available.<type>:<rack>` and `ammo.cap.<type>:<rack>` without
regrouping them or recomputing BV. Existing capped ammo BV, fire-control and
speed modifiers, source inputs and numerical outputs SHALL remain unchanged.
Unavailable native pool facts SHALL remain absent and their remainder SHALL be
reported explicitly.

#### Scenario: Raw pools remain independent of capped ammo and weapon modifiers

- **GIVEN** an SRM-2 with listed BV 21 and Artemis IV, and physical bins valued at 32 and 4
- **WHEN** the vehicle's diagnostic pools are projected
- **THEN** `ammo.available.SRM:2` SHALL be 36 and `ammo.cap.SRM:2` SHALL be 21
- **AND** weapon BV SHALL remain 25.2 and capped ammunition BV SHALL remain 21

#### Scenario: Support fire-control scaling leaves raw pools intact

- **GIVEN** a support vehicle with basic fire control, an SRM-2 valued at 21 and a bin valued at 3
- **WHEN** the vehicle's diagnostic pools are projected
- **THEN** the raw availability SHALL remain 3 and the raw cap SHALL remain 21
- **AND** the existing scaled ammunition BV SHALL remain 2.7

#### Scenario: Defensive launcher caps do not admit defensive ammunition

- **GIVEN** an AMS valued at 32, or two APDS launchers valued at 64 each, with their defensive ammunition
- **WHEN** the shared diagnostic owner supplies their raw native cap facts
- **THEN** `ammo.cap.AMS:2` SHALL be 32 or `ammo.cap.APDS:2` SHALL be 128 respectively
- **AND** defensive ammunition SHALL remain absent from offensive availability, with every existing arithmetic result unchanged

#### Scenario: Project admitted implicit infantry clips on support vehicles

- **GIVEN** a fresh support vehicle carrying native infantry weapons whose positive clip shots and ammunition admission are represented by pinned equipment facts
- **WHEN** its diagnostic ammunition pools are projected
- **THEN** usable generic infantry clips SHALL form one `ammo.available.INFANTRY:0` group with value zero, without a launcher cap
- **AND** initial clip size SHALL be one; a BLK size above one SHALL multiply native clip shots using Java integer truncation
- **AND** combat vehicles, BA weapons, unresolved admission context, native NA or empty clips and intrinsic one-shot ammunition SHALL NOT acquire this group
- **AND** a supplied infantry flag alone SHALL NOT establish ammunition admission
- **AND** existing BV arithmetic, other diagnostic keys, source inputs, loads, validity, catalogs and persisted mounts SHALL remain unchanged

### Requirement: BA ammo diagnostics

The BA mount owner SHALL retain its existing pre-cap ammo BV per native
`ammoType:rackSize` pool and the launcher BV per pool. The trace SHALL format
those supplied facts as `ammo.available.<pool>` and `ammo.cap.<pool>` for the
squad and as `trooper.N.ammo.*` for every trooper, without recalculating BV.
Existing scalar arithmetic, ammo BV, source inputs and totals SHALL remain
unchanged. A pool absent from the owner result SHALL create no term.

#### Scenario: Pre-cap pool beside a capped ammo BV

- **GIVEN** the pinned Cavalier [SRM] source with an SRM-1 launcher and a bin whose pool BV exceeds the launcher BV
- **WHEN** its BA breakdown is projected
- **THEN** `ammo.available.SRM:1` SHALL report the pre-cap pool, `ammo.cap.SRM:1` SHALL equal 15 and ammo BV SHALL remain capped at 15

### Requirement: Infantry per-weapon BV diagnostic projection

The infantry calculation owner SHALL retain the values already computed for
each source-backed weapon call without changing resolution, admission, shooter
counts, arithmetic, modifiers, ammunition, aggregates or totals. Repeated
temporary trooper weapon identities SHALL merge in native call order, including
eligible anti-Mek repeats. Separate field-gun mounts SHALL remain separate.
The trace SHALL format retained values as optional `weapon.*` diagnostics;
it SHALL NOT recalculate contributions or infer missing facts.

#### Scenario: Primary, secondary and anti-Mek weapon calls

- **GIVEN** source infantry with distinct primary and secondary weapons
- **WHEN** the existing owner computes their shooter contributions and eligible anti-Mek repeats
- **THEN** each identity SHALL retain its merged pre-speed weapon contribution
- **AND** archaic weapons SHALL receive no anti-Mek repeat, while prosthetic and augmentation bonuses SHALL remain in the existing remainder

#### Scenario: Shared identities and separate field guns

- **GIVEN** primary and secondary calls with the same weapon identity, or repeated field-gun mounts
- **WHEN** the weapon trace is projected
- **THEN** temporary trooper calls SHALL merge into one identity in call order
- **AND** each field gun SHALL retain its own local mount ordinal, resolved identity, FGUN location and already-computed value

#### Scenario: Zero, absence and replay compatibility

- **GIVEN** a represented zero-valued weapon or a legacy input without source weapon facts
- **WHEN** the breakdown is projected and validated for replay
- **THEN** a represented zero SHALL remain present, and absent facts SHALL remain absent
- **AND** only optional finite values at recognized weapon diagnostic keys SHALL be accepted, with unknown-key rejection preserved
- **AND** existing replay fixtures, digests, golden results and all prior infantry terms SHALL remain unchanged

### Requirement: ProtoMech resolved-zero miscellaneous diagnostics

The ProtoMech equipment owner SHALL retain optional diagnostic facts for actual
resolved catalog zeros of the five represented native miscellaneous identities
with matching, error-free BLK source provenance. Body EI interfaces, myomer
boosters, ProtoMech jump jets and extended jump systems SHALL retain native
location 0 independently of the public mount location. A Torso partial wing
SHALL use the existing native location formatter. The trace SHALL format these
facts with native last-put semantics without changing existing positive facts,
source data, arithmetic, equipment admission, ammunition policy or totals.
Unresolved fallback zeros and missing or unsupported facts SHALL remain absent.

#### Scenario: Actual resolved zeros and retained source locations

- **GIVEN** represented source mounts whose catalog BV resolves to zero at Body or Torso
- **WHEN** the public ProtoMech breakdown and trace are calculated
- **THEN** actual zero-valued native equipment keys SHALL be present at their supported native locations
- **AND** repeated mounts SHALL retain individual facts while duplicate keys use the last actual value
- **AND** all original source values, validity, positive facts and numerical outputs SHALL remain unchanged

#### Scenario: Unknown zeros and missing source evidence

- **GIVEN** an unresolved zero fallback, malformed or absent provenance, unsupported identity or source block, nonzero value or legacy breakdown
- **WHEN** zero-misc diagnostics are projected
- **THEN** no absent or unsupported fact SHALL become an invented zero or native location
- **AND** existing weapon, positive miscellaneous and ammunition projections SHALL remain unchanged


### Requirement: ProtoMech native raw weapon indices

The ProtoMech offensive owner SHALL retain local equipment indices and append
an optional native weapon index where intrinsic one-shot ammo shifts subsequent
mount positions. The independent generated insertion counts SHALL account for
two ammo mounts after each Fusillade. The trace SHALL format the supplied native
index with a local-index fallback for legacy snapshots. Existing source data,
equipment identities, ammunition, validity, persistence and BV SHALL remain
unchanged. Legacy weapon-flag tables SHALL remain unchanged.

#### Scenario: Sprite 3 double one-shot launcher positions

- **GIVEN** pinned Sprite 3 source weapon indices 7, 8, 9 and 10
- **WHEN** its public breakdown and raw weapon terms are calculated
- **THEN** local indices SHALL remain 7, 8, 9 and 10 while raw keys use native indices 7, 10, 13 and 14
- **AND** only the latter three raw weapon keys SHALL change across the 86-source ProtoMech corpus
- **AND** all mount values, other terms, source data and BV SHALL remain unchanged

### Requirement: BA weapon diagnostics

The BA mount owner SHALL retain each counted weapon or claw mount with its full
catalog BV, native location and section memberships, and the BA calculation
owner SHALL derive each trooper's per-mount values in the pinned section order
(Weapons, Squad Support, Anti-Mek), summing the passes of one mount. The trace
SHALL format those values as `weapon.<n>.<location>.<id>` for the squad (trooper
1) and as `trooper.N.weapon.*` for every trooper, without recalculating BV.
Existing scalar arithmetic, source inputs and totals SHALL remain unchanged.
A mount without a native location, a legacy input and mounts no section counts
SHALL create no term. The terms establish per-location value parity only, not
native equipment numbers or names.

#### Scenario: Trooper-located and support mounts

- **GIVEN** a David Light Gauss Rifle carried by trooper 2 of an eligible four-trooper squad
- **WHEN** its BA breakdown is projected
- **THEN** `trooper.2.weapon.*.Trooper 2.*` SHALL equal 14 and no other trooper or squad-level term SHALL list that mount
- **AND** the same rifle marked squad support at the squad SHALL report `7 / 4 + 7 / 4 = 3.5` for every trooper
