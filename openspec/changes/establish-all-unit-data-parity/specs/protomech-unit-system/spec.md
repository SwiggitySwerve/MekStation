## MODIFIED Requirements

Scope: this delta corrects engine rating, normal-engine mass, movement-field
consistency, derived running, internal structure and armor limits. Existing
weight-class labels, tonnage/MP caps and default-speed choices
are retained below to keep modified requirements complete; their fidelity is
not independently established by this slice. Native source projection is specified
in the unit-services delta. Other component mass, equipment, production serialization and
complete numerical/BV parity remain open.

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
- **THEN** they SHALL display domain-calculated walk and running MP without inline running arithmetic

#### Scenario: Preservation and comparison scope

- **WHEN** loading saved state with an existing flank MP or making an unrelated edit
- **THEN** the stored movement values SHALL NOT be silently migrated
- **AND** a later movement-affecting edit SHALL recalculate flank MP
- **WHEN** comparing sources with unresolved booster equipment identity
- **THEN** those differences SHALL remain explicitly unmatched rather than counted as source movement parity
- **AND** jump rules, damaged-unit options, construction caps, equipment identity, complete BV and production persistence/editor proof SHALL remain separate
