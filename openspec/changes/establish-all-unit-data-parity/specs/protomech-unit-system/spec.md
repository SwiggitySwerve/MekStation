## MODIFIED Requirements

Scope: this delta corrects engine rating, normal-engine mass, movement-field
consistency, derived running, internal structure and armor limits. Existing
weight-class labels, tonnage/MP caps and default-speed choices
are retained below to keep modified requirements complete; their fidelity is
not independently established by this slice. Native source projection is specified
in the unit-services delta. Other component mass, equipment, production serialization and
complete numerical/BV parity remain open. The Chassis Variants and Main Gun
System requirements are modified only to replace the quad main-gun ban with the
pinned slot limit.

### Requirement: Weight Classes

The system SHALL support three ProtoMech weight classes based on individual unit tonnage (2-9 tons).

#### Scenario: Light ProtoMech (2-4 tons)

- **WHEN** individual ProtoMech tonnage is 2, 3, or 4 tons
- **THEN** weight class SHALL be `Light`

#### Scenario: Medium ProtoMech (5-6 tons)

- **WHEN** individual ProtoMech tonnage is 5 or 6 tons
- **THEN** weight class SHALL be `Medium`

#### Scenario: Heavy ProtoMech (7-9 tons)

- **WHEN** individual ProtoMech tonnage is 7, 8, or 9 tons
- **THEN** weight class SHALL be `Heavy`

#### Scenario: Tonnage clamping

- **WHEN** setting ProtoMech tonnage via the store
- **THEN** the system SHALL clamp the value to the range 2-9 tons
- **AND** recalculate cruise MP as `max(1, 10 - tonnage)` and synchronize walk MP
- **AND** recalculate flank MP through the Derived Running Movement requirement
- **AND** recalculate engine rating through the Engine Rating requirement using the current chassis

#### Scenario: Invalid weight validation

- **WHEN** a ProtoMech weighs less than 2 tons
- **THEN** validation SHALL produce an error: "ProtoMech must be at least 2 tons"
- **WHEN** a ProtoMech weighs more than 9 tons
- **THEN** validation SHALL produce an error: "ProtoMech cannot exceed 9 tons"

### Requirement: Movement

The system SHALL track cruise, flank, and jump movement points.

#### Scenario: Cruise MP

- **WHEN** setting cruise MP
- **THEN** the value SHALL be clamped to minimum 1 and walk MP SHALL match that admitted value
- **AND** flank MP SHALL follow the Derived Running Movement requirement
- **AND** engine rating SHALL follow the Engine Rating requirement using the admitted base speed and current chassis

#### Scenario: Flank MP (derived)

- **WHEN** displaying flank MP
- **THEN** flank MP SHALL follow the Derived Running Movement requirement
- **AND** flank MP SHALL be read-only in the UI

#### Scenario: Jump MP

- **WHEN** setting jump MP
- **THEN** the value SHALL be clamped to minimum 0
- **AND** the UI SHALL enforce maximum of `cruiseMP`

#### Scenario: Default cruise MP from tonnage

- **WHEN** creating a new ProtoMech with a given tonnage
- **THEN** default cruise MP SHALL be `max(1, 10 - tonnage)`

#### Scenario: Movement validation

- **WHEN** validating movement
- **THEN** cruise MP MUST be at least 1
- **AND** validation SHALL produce an error if cruise MP is less than 1: "ProtoMech must have at least 1 cruise MP"

#### Scenario: Motion type derivation

- **WHEN** parsing from BLK format
- **THEN** motion type SHALL be `Jump` if `jumpMP > 0`, otherwise `Foot`

### Requirement: Engine Rating

The construction owner SHALL derive ProtoMech engine rating using pinned MegaMek
`48fcb2f64a1b3f2d575707ce5653dad64927b587`, `TestProtoMek.java:548-562`:
take `ceil(baseWalkMP * 1.5)`, subtract 2 for Quad or Glider, multiply by tonnage,
truncate toward zero, and round upward to a multiple of 5 only when the result
exceeds 40. Biped and the existing Ultraheavy enum SHALL use the unadjusted
factor. The optional myomer booster SHALL NOT change the base rating. This
calculation SHALL NOT assert construction legality or complete engine mass.

#### Scenario: Rating stages and chassis

- **WHEN** deriving biped ratings at 5 tons / walk 4 and 9 tons / walk 4
- **THEN** the results SHALL be 30 and 55 respectively
- **WHEN** deriving a quad rating at 4 tons / walk 6
- **THEN** the result SHALL be 28
- **WHEN** deriving a biped rating at 2.5 tons / walk 3
- **THEN** the result SHALL truncate to 12

#### Scenario: Rating rounding boundary

- **WHEN** deriving biped ratings at 2 tons / walk 13 and walk 14
- **THEN** the results SHALL be exactly 40 and 45

#### Scenario: Reactive consumers use the owner

- **WHEN** creating defaults, parsing a legacy ProtoMech document, or editing tonnage, chassis or base movement
- **THEN** the resulting rating SHALL use this owner with the effective tonnage, base speed and chassis
- **AND** store walk/cruise aliases SHALL agree after these edits
- **AND** explicitly supplied zero source speed SHALL be retained, not replaced with the omitted-speed default

#### Scenario: Setting engine rating directly

- **WHEN** setting a representable safe integer engine rating
- **THEN** the store SHALL retain its current nonnegative integer walk speed if that speed has exactly the requested rating
- **OTHERWISE** it SHALL select the greatest nonnegative integer speed with exactly that rating
- **AND** walk/cruise aliases SHALL both match that speed and flank MP SHALL use that speed and the explicit booster state through the Derived Running Movement requirement
- **AND** inversion SHALL query the authoritative forward function rather than duplicate its arithmetic

#### Scenario: Unrepresentable direct rating is rejected atomically

- **WHEN** a direct rating is nonfinite, outside safe integer representation, fractional or has no nonnegative safe integer speed for this tonnage and chassis
- **THEN** the setter SHALL throw a rating diagnostic before any state or derived BV change

### Requirement: Internal Structure

The construction owner SHALL calculate original ProtoMech internal points from
tonnage, chassis and main-gun presence using MegaMek
`48fcb2f64a1b3f2d575707ce5653dad64927b587`, `ProtoMek.java:785-826`.
It SHALL truncate tonnage toward zero for torso and table lookup. Head points
SHALL be 1 at integer weights 2-5, 2 at 6-9, 3 at 10-13, and 4 otherwise.
Biped/Glider leg points SHALL be 2,3,4,5,6,7 for weight pairs 2-3 through
12-13, and 8 otherwise. Quad leg points SHALL be 4,5,8,9,12,13 for those
pairs, and 14 otherwise. Non-Quad arms SHALL equal head points. A present
main-gun mount SHALL have 1 point through 9 tons and 2 above 9 tons, using
untruncated tonnage. The existing Ultraheavy enum SHALL use Biped structure.

The local fixed six-key record SHALL store zero for Quad arms and an absent
main-gun mount; chassis and mount flags SHALL preserve absence separately from
a real zero-valued location. Upstream's absent-location sentinel SHALL NOT be
summed as points. Construction legality SHALL remain a separate diagnostic.

#### Scenario: Shared defaults and source loading

- **WHEN** loading a 9-ton Biped with a main-gun mount
- **THEN** Head/Torso/Left Arm/Right Arm/Legs/Main Gun SHALL be 2/9/2/2/5/1
- **WHEN** creating a 9-ton Quad without a main-gun mount
- **THEN** those points SHALL be 2/9/0/0/9/0
- **AND** both consumers SHALL call the construction owner

#### Scenario: Fractional and construction-invalid tonnage

- **WHEN** deriving structure at 9.5 tons with a main-gun mount
- **THEN** table lookup and torso SHALL use 9 while main-gun points SHALL be 2
- **WHEN** deriving structure at 1.5 tons
- **THEN** head SHALL be 4, torso 1, and legs 8 or 14 by chassis
- **AND** these values SHALL NOT assert that the design is legal

#### Scenario: Invalid numeric boundary

- **WHEN** tonnage is nonfinite, nonpositive or greater than the maximum signed 32-bit integer
- **THEN** the owner SHALL reject it with a tonnage diagnostic before returning structure
- **AND** every supported BLK spelling SHALL return that admission failure through the handler's structured parse result rather than throw

#### Scenario: Reactive structure and BV

- **WHEN** editing tonnage, chassis or main-gun presence
- **THEN** the store SHALL recalculate all structure points using admitted values and current topology
- **AND** its existing synchronous BV calculation SHALL receive those points
- **AND** existing tonnage caps and movement policies SHALL remain unchanged

#### Scenario: Stored and manually edited structure

- **WHEN** opening existing state or setting an individual location's structure
- **THEN** existing stored values and the nonnegative manual setter SHALL remain available
- **AND** identity or movement edits SHALL NOT silently replace those structure values
- **AND** the next tonnage, chassis or mount edit SHALL restore the owner's calculated structure
- **AND** this slice SHALL NOT claim a migration or production source-to-store flow

#### Scenario: Printing topology and pips

- **WHEN** printing data declares a Quad or an empty main-gun mount
- **THEN** extraction SHALL preserve those flags and bindings SHALL use the shared structure owner
- **AND** Quad arm pips SHALL be absent and a declared empty main-gun mount SHALL retain its pips
- **WHEN** legacy printing data omits explicit main-gun presence
- **THEN** its existing weapon-name presence fallback SHALL remain supported

#### Scenario: Duplicated structure

- **WHEN** duplicating a ProtoMech through the store registry
- **THEN** the duplicate SHALL preserve the source's chassis, main-gun presence and independent copy of every stored structure value, including manual values
- **AND** the duplicate's structure contribution to BV SHALL use those copied points
- **AND** editing the duplicate's structure SHALL NOT alter the source's structure

### Requirement: Chassis Variants

The system SHALL support biped, quad, and glider ProtoMech configurations.

#### Scenario: Biped (default)

- **WHEN** creating a ProtoMech without specifying chassis variant
- **THEN** `isQuad` SHALL be `false`
- **AND** `isGlider` SHALL be `false`

#### Scenario: Quad ProtoMech

- **WHEN** the raw tag `quad` is `"true"` or `"1"` in a BLK document
- **THEN** `isQuad` SHALL be set to `true`
- **AND** a quad ProtoMech MAY mount a Main Gun, which SHALL hold one slot-taking mount, or two when the quad is also ultraheavy, as the ProtoMech Main Gun And Arm Placement requirement defines (MegaMek `TestProtoMek.java:594,620-621` at `48fcb2f64`)

#### Scenario: Glider ProtoMech

- **WHEN** the raw tag `glider` is `"true"` or `"1"` in a BLK document
- **THEN** `isGlider` SHALL be set to `true`
- **AND** glider ProtoMechs SHALL require at least 2 jump MP
- **AND** validation SHALL produce an error if jump MP is less than 2: "Glider ProtoMechs require at least 2 jump MP"

### Requirement: Main Gun System

The system SHALL support an optional dedicated main gun mount.

#### Scenario: Enabling main gun

- **WHEN** `hasMainGun` is set to `true`
- **THEN** the `Main Gun` location SHALL be available for equipment and armor
- **AND** main gun presence SHALL be detected from equipment location during BLK parsing

#### Scenario: Quad main gun limit

- **WHEN** a quad ProtoMech has main gun equipment
- **THEN** validation SHALL NOT report an error for the Main Gun's presence
- **AND** the Main Gun SHALL hold one slot-taking mount, or two when the quad is also ultraheavy (above 9 tons), as the ProtoMech Main Gun And Arm Placement requirement defines (MegaMek `TestProtoMek.java:594,620-621` at `48fcb2f64`)

#### Scenario: Main gun detection during parsing

- **WHEN** parsing a BLK document
- **THEN** `hasMainGun` SHALL be `true` if any equipment has location `Main Gun`

## ADDED Requirements

### Requirement: ProtoMech Engine Mass

The construction owner SHALL calculate normal ProtoMech engine mass using pinned
MegaMek `Engine.java:396-450` and `RoundWeight.java` at 48fcb2f6. Source loading and
canonical handler/store projections SHALL use that owner. This requirement covers
normal fusion engines only, independently of construction legality and complete BV.

#### Scenario: Low-rating kilogram mass

- **WHEN** an integer engine rating is between0 and39 inclusive
- **THEN** raw mass SHALL be rating times0.025 tons
- **AND** mass SHALL round to the nearest gram, then upward to the next kilogram
- **AND** rating0 SHALL return exactly0, rating1 SHALL return0.025 and rating39 SHALL return0.975 tons

#### Scenario: Shared engine table

- **WHEN** an integer engine rating is between40 and500 inclusive
- **THEN** the owner SHALL use the existing standard-fusion table at the next multiple of5
- **AND** apply the same kilogram rounding
- **AND** ratings40 and45 SHALL return1 ton, rating46 SHALL return1.5 tons, and rating500 SHALL return462.5 tons
- **AND** no duplicate rating table SHALL be introduced

#### Scenario: Unavailable mass on an invalid rating

- **WHEN** a rating is negative, fractional, nonfinite or greater than500
- **THEN** calculated mass SHALL be null with a rating diagnostic available from the owner
- **AND** a structurally loadable source SHALL retain its original rating, load with construction diagnostics and expose null engine mass
- **AND** existing BV projections and store edits SHALL remain usable without treating unavailable mass as numeric zero
- **AND** this local failure contract SHALL NOT claim parity with Java's invalid-engine constructor or out-of-table behavior

#### Scenario: Derived data and scope

- **WHEN** a loaded unit or store snapshot is projected for calculation
- **THEN** engine mass SHALL be derived from its current rating rather than stale saved mass
- **AND** the mass correction alone SHALL NOT change the existing BV result
- **AND** no mass migration, total-unit mass, equipment parity or production editor/save/reload proof SHALL be inferred

### Requirement: ProtoMech Armor Limits

The construction owner SHALL calculate total and per-location armor limits from
pinned MegaMek `TestProtoMek.java:675-740` at 48fcb2f6. The exported utility,
allocation action and armor-input consumers SHALL use that owner. Existing
policies SHALL be consolidated with unchanged observations before correction.

#### Scenario: Independent total and location limits

- **WHEN** calculating armor limits for a 5-ton Biped without a main-gun mount
- **THEN** the total cap SHALL be24 and Head/Torso/Left Arm/Right Arm/Legs/Main Gun caps SHALL be4/10/2/2/6/0
- **WHEN** calculating limits for a 5-ton Quad with a main-gun mount
- **THEN** the total cap SHALL be27 and those location caps SHALL be4/10/0/0/10/3
- **AND** construction legality of that chassis/mount combination SHALL remain separate
- **AND** the total cap SHALL be calculated independently rather than assumed to equal the sum of location caps

#### Scenario: Source rule boundaries and original structure

- **WHEN** calculating limits at fractional or construction-invalid positive tonnage
- **THEN** the total table index and head limit SHALL use Java's truncated weight while arm and main-gun thresholds SHALL use original weight
- **AND** torso and leg caps SHALL use twice original internal points and a present main-gun cap SHALL use three times its original points
- **AND** Quad arms and an absent main-gun mount SHALL have zero armor capacity
- **AND** unusable numerical inputs SHALL produce a clear domain diagnostic without fabricating a successful cap

#### Scenario: Retain loaded and manually allocated armor

- **WHEN** loading a readable source whose armor exceeds a location or total cap
- **THEN** source armor and topology SHALL be retained and loading SHALL report construction errors separately
- **AND** unrelated fields and the BV result calculated from that unchanged armor SHALL remain unchanged
- **WHEN** opening saved state or changing identity or movement
- **THEN** stored armor SHALL NOT be silently redistributed

#### Scenario: Explicit allocation and input limits

- **WHEN** the user invokes the existing automatic allocation action
- **THEN** its result SHALL contain nonnegative integer points within both the shared total and location caps
- **AND** Quad arms and absent Main Gun SHALL receive zero points
- **AND** the existing synchronous BV update SHALL consume the resulting allocation
- **AND** the action's armor-budget policy SHALL be documented separately from upstream construction limits
- **AND** its budget SHALL be the lesser of total capacity and summed location capacities, allocated proportionally with leftover points in location enum order
- **WHEN** changing a location through the armor input consumer
- **THEN** the consumer SHALL use the shared location cap for current topology and original structure
- **AND** no inline copy of a construction table or formula SHALL remain in rendering code

#### Scenario: Evidence scope

- **WHEN** reporting armor-limit completion
- **THEN** actual pinned Java observations and all86 original sources SHALL be compared explicitly
- **AND** source field preservation and invalid-design diagnostics SHALL be recorded separately
- **AND** incomplete editor/import/save/reload, equipment, full BV, partial-budget allocation and subtype presentation proof SHALL remain open

### Requirement: ProtoMech Derived Running Movement

The construction owner SHALL calculate undamaged running MP from original walk
and explicit booster state using pinned MegaMek Entity.java and ProtoMek.java
at 48fcb2f6. Existing distinct running policies SHALL first be consolidated with
unchanged outputs in a separately verified refactor.

#### Scenario: Ordinary and boosted running

- **WHEN** original walk MP is 0, 1, 3, 4 or 5 without a booster
- **THEN** running MP SHALL be 0, 2, 5, 6 or 8 respectively
- **WHEN** an enabled myomer booster is explicitly modeled
- **THEN** running MP SHALL be twice original walk while effective walk SHALL remain original walk
- **AND** the booster SHALL NOT change the base engine rating

#### Scenario: Derived movement consumers

- **WHEN** creating a default ProtoMech or changing tonnage, chassis, engine rating, cruise, walk or booster state
- **THEN** the resulting flank MP SHALL come from the running owner using the resulting base walk and booster state
- **AND** existing movement clamps and default choices SHALL remain separate policies
- **WHEN** projecting handler data, or a store snapshot without flank MP
- **THEN** running MP SHALL come from the same owner using the supplied base walk and explicit booster flag
- **WHEN** rendering movement controls
- **THEN** they SHALL display stored walk and flank MP without inline running arithmetic
- **AND** their Run display SHALL agree with the status bar and BV input, including preserved saved flank values

#### Scenario: Preservation and comparison scope

- **WHEN** loading saved state with an existing flank MP or making an unrelated edit
- **THEN** the stored movement values SHALL NOT be silently migrated
- **AND** a later movement-affecting edit SHALL recalculate flank MP
- **WHEN** comparing sources with unresolved booster equipment identity
- **THEN** those differences SHALL remain explicitly unmatched rather than counted as source movement parity
- **AND** jump rules, damaged-unit options, construction caps, equipment identity, complete BV and production persistence/editor proof SHALL remain separate

### Requirement: ProtoMech Main Gun And Arm Placement

The construction owner SHALL limit the Main Gun and arm locations from pinned
MegaMek `TestProtoMek.java` at 48fcb2f64 (`maxSlotsByLocation`,
`maxWeightByLocation`, `requiresSlot`, `hasIllegalEquipmentCombinations`). The
hand-written approved-weapon list, heavy-weapon arm class and required-weapon
finding SHALL NOT be rules.

#### Scenario: Location limits

- **WHEN** a ProtoMech above 9 t is ultraheavy
- **THEN** each arm SHALL hold one mount of at most 1.0 t, otherwise 0.5 t, and a Quad SHALL hold none
- **AND** the Main Gun SHALL hold one slot-taking mount of any weight, or two on a Quad that is also ultraheavy
- **AND** ammunition, MASC, UMU, jump jets and the EI interface SHALL take no slot

#### Scenario: Agreement with the pinned verifier

- **WHEN** the rule is applied to the 86 canonical ProtoMechs
- **THEN** each unit's verdict SHALL equal the pinned verifier's `hasIllegalEquipmentCombinations` verdict
- **AND** an enabled Main Gun with nothing in it SHALL be valid

#### Scenario: Unknown versus excluded weapons

- **WHEN** the catalog describes a weapon and omits ProtoMech from its allowed unit types
- **THEN** the rule SHALL report it as not a legal ProtoMech weapon
- **WHEN** the catalog carries no unit-type list for a weapon
- **THEN** the rule SHALL NOT reject it
- **AND** a mount whose weight is unknown or unit-dependent SHALL count its slot and add no invented weight

#### Scenario: Scope boundary

- **WHEN** checking torso, head or leg placement
- **THEN** this requirement SHALL NOT enforce it, because the torso needs the armor slot and variable weights
- **AND** the former statement that a quad cannot have a main gun is replaced by the Chassis Variants and Main Gun System requirements above, because the pinned verifier gives a quad one Main Gun slot (two when ultraheavy) and the pinned corpus contains a quad ultraheavy with one

### Requirement: ProtoMech Auto Armor Allocation

The construction owner SHALL place armor as MegaMekLab 62bf193 does in
`PMStructureTab.autoAllocateArmor` and `allocateLeftoverPoints`, using the armor
limits of the ProtoMech Armor Limits requirement. The proportional MekStation
policy SHALL NOT remain.

#### Scenario: Proportional pass and leftover order

- **WHEN** allocating a point count to a ProtoMech
- **THEN** each location SHALL first take its limit times the count over the total cap, truncated and never more than remain, in the order Head, Torso, Right Arm, Left Arm, Legs, Main Gun
- **AND** a count above the total cap SHALL be treated as the cap
- **AND** leftover points SHALL go one at a time to the torso, legs, head, then both arms, then the head again when a main gun is mounted
- **AND** a Quad SHALL start the leftover with the legs and SHALL have no arm step

#### Scenario: Points aimed at a full location

- **WHEN** edited internal structure leaves the location limits unable to hold the count
- **THEN** a leftover point aimed at a full location SHALL be dropped, as upstream drops it
- **AND** the placed total SHALL NOT exceed the count or the cap

#### Scenario: Agreement with MegaMekLab

- **WHEN** the owner is run over the pinned table of 2,944 allocations from the original classes
- **THEN** every location of every case SHALL equal the original result
- **AND** the editor's Auto action, which passes no count, SHALL place the legal total

### Requirement: ProtoMech Equipment Tab

The ProtoMech Equipment tab SHALL offer the catalog items MegaMekLab 62bf193 `ProtoMekUtil.isProtoMekEquipment(eq, proto)` accepts, list the loadout the way `PMEquipmentTab.showInLoadOut` does, and place each mount in a location of this editor. Placement findings SHALL be those of the pinned verifier.

#### Scenario: Items offered

- **WHEN** the Equipment tab lists the catalog
- **THEN** ammunition SHALL be offered
- **AND** a weapon or miscellaneous item SHALL be offered only when the catalog lists ProtoMech among its allowed unit types, the catalog form of `F_PROTO_WEAPON` and `F_PROTOMEK_EQUIPMENT`
- **AND** an item the catalog does not describe SHALL NOT be offered, while placement validation SHALL keep treating an absent list as unknown rather than illegal
- **AND** the configuration rules of the three-argument form (magnetic clamp on a quad or glider, the club flags) SHALL NOT filter the list, as `UnitUtil.isEntityEquipment` calls the two-argument form

#### Scenario: Loadout list and placement

- **WHEN** the loadout lists a unit's mounts
- **THEN** jump jets, MASC, partial wing, magnetic clamp and UMU mounts SHALL NOT be listed
- **AND** an added item SHALL start in the Torso and SHALL be movable to the Left Arm or Right Arm (not on a quad) or to the Main Gun (only when the mount exists)
- **AND** the slot and weight findings of `getProtoPlacementErrors` SHALL be shown for the whole unit
- **AND** each edit SHALL persist through save and reopen

#### Scenario: Known gaps

- **GIVEN** the MekStation mount has no shot count, where MegaMekLab merges ammunition into one `LOC_BODY` mount (`PMEquipmentDatabaseView.addProtoMekAmmo`)
- **THEN** an ammunition item added from the catalog SHALL be a plain mount, and the shot count SHALL remain a recorded residual
- **AND** the "+2 jump from gliding wings" rule SHALL remain outside this requirement, since it has no pinned citation

### Requirement: Electric Discharge ProtoMech Armor

The ProtoMech armor owner SHALL represent Standard and Electric Discharge armor
using pinned MegaMek `48fcb2f64` identities and component rules. Existing numeric
armor fields SHALL remain compatible; legacy Standard code 0 or an omitted
source code SHALL retain Standard meaning. Unsupported identities SHALL produce
diagnostics. Tech filtering remains deferred under owner ruling O3.

#### Scenario: EDP armor selection and weight

- **WHEN** a user selects Electric Discharge ProtoMech armor
- **THEN** the editor SHALL display the Experimental choice and allocated mass at 0.075 t per point
- **AND** 31 points SHALL retain Java's unrounded allocated mass, approximately 2.325 t
- **AND** complete ProtoMech mass SHALL round once to the nearest kilogram, without half-ton armor rounding

#### Scenario: Single torso slot and equipment BV owner

- **WHEN** a ProtoMech uses Electric Discharge armor
- **THEN** validation SHALL add one torso slot separately from ordinary equipment, excluding the armor mount from ordinary slot counting
- **AND** the existing armor equipment mount SHALL supply its 32 BV exactly once through the miscellaneous offensive-equipment owner
- **AND** switching to Standard SHALL remove the EDP mount and retain all other equipment and armor points

#### Scenario: Full torso compatibility

- **WHEN** selecting EDP on a ProtoMech whose torso is full
- **THEN** MekStation SHALL retain every existing equipment mount and allow the armor edit
- **AND** it SHALL display the torso slot-overflow validation diagnostic
- **AND** the documented compatibility deviation SHALL identify that pinned MML unassigns optional mounts while MekStation has no unallocated ProtoMech location yet

#### Scenario: Save and reopen EDP

- **WHEN** either pinned Basilisk ProtoMech Quad variant is edited, saved and reopened
- **THEN** armor identity, armor points and a single EDP mount SHALL be retained
- **AND** armor mass, component total mass, slot validity and BV SHALL match the pinned Java observations

#### Scenario: ProtoMech numerical regression

- **WHEN** calculating the 86 pinned canonical ProtoMechs
- **THEN** handler and shared-dispatch BV SHALL each equal the actual pinned Java total
- **AND** no construction-validity result SHALL move away from the pinned Java verdict

### Requirement: ProtoMech Glider And Partial Wing Jump

The editor SHALL show jump MP as pinned MegaMek `48fcb2f64` `ProtoMek.getJumpMP` (ProtoMek.java:452-492) gives it: the stored jump MP plus the Partial Wing bonus. A glider SHALL have no jump bonus of its own, because it is a WiGE unit that flies on its walk MP; the "gliding wings, +2 jump" rule SHALL NOT exist.

#### Scenario: Partial Wing is the only jump bonus

- **WHEN** a ProtoMech has a mounted Partial Wing
- **THEN** the effective jump the editor shows SHALL be the stored jump MP plus 2, the standard-atmosphere bonus of ProtoMek.java:470-487, as MML 62bf193 `MovementView.java:456-465` shows
- **AND** the bonus table (+3 very high or high, +2 standard or thin, +1 trace, otherwise 0, and 0 when the wing is not working or weather is ignored) SHALL be implemented once, by the pure `partialWingJumpBonus` owner that gameplay movement also uses
- **AND** a unit without a Partial Wing SHALL show no effective-jump bonus, glider or not
- **AND** BV and validation SHALL keep reading the stored jump MP, since the bonus applies only when weather is not ignored and BV ignores it

#### Scenario: Glider jump control

- **WHEN** a ProtoMech is a glider
- **THEN** the editor's jump control SHALL be fixed at 0, as MML `MovementView.java:265-268` fixes it
- **AND** changing a unit to a glider SHALL set its stored jump MP to 0
- **AND** no validation rule SHALL be added, because the pinned verifier does not reject a glider's jump MP above 0 (TestProtoMek.java:454-457)

#### Scenario: Legacy gliding wings field

- **THEN** the `glidingWings` field SHALL remain in state, saved units and BV cache keys as an inert legacy field with no editor control and no rule
- **AND** no saved format SHALL change

#### Scenario: Recorded residuals

- **THEN** the in-game Partial Wing bonus by atmosphere (+3 high or very high, +2 standard or thin, +1 trace, 0 otherwise) SHALL remain unimplemented in gameplay movement, to be routed to its owner
- **AND** the jump cap, the glider weight rule and the ultraheavy jump rule SHALL be those of the ProtoMech Movement Construction Rules requirement (`TestProtoMek.maxJumpMP` and `correctMovement`), so that this requirement's editor jump lock is an editor input rule only and SHALL NOT be read as a validity rule

### Requirement: ProtoMech Movement Construction Rules

ProtoMech movement validity SHALL be the rules of pinned MegaMek `48fcb2f64` `TestProtoMek.correctMovement` (TestProtoMek.java:445-464) and `maxJumpMP` (TestProtoMek.java:84-92), implemented once in a pure owner that source validation and the editor validation rules both call. The owner SHALL NOT apply the weight-class walk and jump caps, a glider weight limit, a ban on an ultraheavy jumping, or a Myomer Booster weight class, none of which the pinned verifier has.

#### Scenario: Jump and UMU cap

- **WHEN** a ProtoMech's jump MP or UMU count is validated
- **THEN** each SHALL be at most its original walk MP, or at most 1.5 times that rounded up when an Extended Jump Jet System (`S_IMPROVED`, MiscType.java:2054-2060) is mounted
- **AND** a violation SHALL read "Exceeds maximum jump MP." or "Exceeds maximum UMU MP."
- **AND** the Extended Jump Jet System SHALL be recognized by one predicate in the owner, because the equipment catalog has no entry or flag for it

#### Scenario: Glider and quad minimums

- **WHEN** a glider's running MP is below 4, or a quad's is below 3
- **THEN** validation SHALL report "Glider ProtoMeks have a minimum flanking MP of 4." or "Quad ProtoMeks have a minimum running MP of 3."
- **AND** the glider and quad checks SHALL be exclusive, as in the verifier

#### Scenario: Agreement with the pinned verifier

- **WHEN** the production handler validates the 86 canonical ProtoMechs and the 20 pinned synthetic variants of `fixtures/movement-java-verdicts.json`
- **THEN** its movement findings SHALL equal Java's `correctMovement` verdict and message for every one
- **AND** no validity result of a canonical unit SHALL move, since the 86 already agree with Java
- **AND** a change that adds a finding SHALL only add one Java also reports

#### Scenario: Scope boundary

- **THEN** the editor's input clamps, jump lock and Myomer Booster control SHALL be governed by the ProtoMech Editor Movement Limits requirement, and not by this validity requirement

### Requirement: ProtoMech Editor Movement Limits

The editor's walk and jump inputs SHALL accept what MegaMekLab 62bf193 accepts for a ProtoMech, and SHALL NOT apply a weight-class walk or jump cap, a ban on an ultraheavy jumping, or a Myomer Booster weight class, none of which MML or the pinned verifier has. The limits SHALL be implemented once in a pure owner that reuses the movement rules owner's `protoMaxJumpMP`.

#### Scenario: Walk limits

- **WHEN** a walk MP is entered
- **THEN** it SHALL be raised to the motive's minimum: biped 1, quad `floor(3 / 1.5)` = 2, glider `ceil(4 / 1.5)` = 3 (`MovementView.java:267,270,272`)
- **AND** it SHALL be capped at the largest walk whose engine rating is a valid engine, rating at most 500, as MML refuses a walk whose engine is invalid (`PMStructureTab.recalculateEngineRating`, `:264-276`)
- **AND** there SHALL be no weight-class walk cap

#### Scenario: Jump limits

- **WHEN** a jump MP is entered
- **THEN** it SHALL be at most `TestProtoMek.maxJumpMP` for the unit: the walk MP, or 1.5 times it rounded up when an Extended Jump Jet System is mounted (`MovementView.java:233`)
- **AND** a glider's jump SHALL be fixed at 0 and its control disabled (`MovementView.java:265-268,354`), while an ultraheavy's SHALL NOT be locked
- **AND** lowering the walk MP below the jump MP, or choosing a motive with a lower limit, SHALL lower the jump MP to the new limit, as MML does (`MovementView.java:370-371`)

#### Scenario: Pinned units are unchanged by re-applying their own values

- **WHEN** each of the 86 canonical ProtoMechs re-applies its own walk MP, jump MP and chassis through the store
- **THEN** its walk MP, jump MP, run MP and engine rating SHALL NOT change

#### Scenario: Controls and defaults

- **THEN** the Myomer Booster control SHALL carry no weight-class qualifier and SHALL be disabled only for a glider, keeping its stored value (`PMChassisView.java:230-231`)
- **AND** the glider chassis label SHALL carry no weight qualifier
- **AND** a new ProtoMech SHALL start at walk 4, which meets every motive's minimum
- **AND** the tonnage clamps and the ultraheavy chassis value SHALL remain as they are, for the separate ultraheavy-as-mass item

### Requirement: Native ProtoMech complete construction mass

SHALL compute native ProtoMech construction mass in one weight owner from engine,
structure, controls, allocated armor, admitted equipment, per-shot ammunition and
heat-neutral sinks, matching MegaMek 48fcb2f64 to the kilogram.

SHALL resolve ProtoMech launcher mass through one native-family/rack multiplier
table and mounted JJ, UMU, Myomer Booster, magnetic-clamp and partial-wing mass
with their unit-dependent formulas rather than context-free catalog zeros.

SHALL reuse the existing heat-neutral weapon and linked-load owners, excluding
ammunition-fed chemical-laser heat while retaining native plasma heat.

#### Scenario: Synthetic propulsion and launcher weight

- **WHEN** loading the 20 pinned-Hydra synthetic designs through the production handler
- **THEN** every component and total mass SHALL match the pinned original Java verifier
- **AND** all 13 previously omitted weight failures SHALL be reported
- **AND** the seven weight-valid designs SHALL retain their weight verdicts
- **AND** propulsion mass SHALL follow mounts independently of movement fields

#### Scenario: Canonical ProtoMech mass and validity

- **WHEN** loading all 86 pinned canonical ProtoMechs
- **THEN** every complete mass SHALL match the original Java verifier
- **AND** Svartalfa 3 SHALL remain the only invalid canonical design
- **AND** the valid SvartAlfa Ultra SHALL weigh 13,950 kg without chemical-laser sinks
- **AND** existing ProtoMech BV inputs and results SHALL remain unchanged

#### Scenario: Unavailable construction mass

- **WHEN** a mount, engine, armor or heat requirement cannot be resolved
- **THEN** a complete mass SHALL be unavailable with the missing input identified
- **AND** a known subtotal SHALL remain available only when the core mass is known
- **AND** validation SHALL use the known subtotal without inventing a zero mass

#### Scenario: Formula boundaries and final rounding

- **WHEN** resolving propulsion and clamp mounts at 5, 6, 9, 10 or 15 tons
- **THEN** their masses SHALL match the corresponding original Java tiers
- **AND** extended jump jets SHALL double only their own mass
- **AND** ammunition SHALL retain per-bin kilogram ceiling
- **AND** the complete component sum SHALL round to the nearest kilogram
