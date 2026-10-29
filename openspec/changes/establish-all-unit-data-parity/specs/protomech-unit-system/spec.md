## MODIFIED Requirements

Scope: this delta corrects engine rating, movement-field consistency and internal
structure. Existing
weight-class labels, tonnage/MP caps, default-speed choices and flank policies
are retained below to keep modified requirements complete; their fidelity is
not independently established by this slice. Native source projection is specified
in the unit-services delta. Engine mass, equipment, production serialization and
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
- **AND** recalculate flank MP as `floor(cruiseMP * 1.5)`
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
- **AND** flank MP SHALL be recalculated as `floor(cruiseMP * 1.5)`
- **AND** engine rating SHALL follow the Engine Rating requirement using the admitted base speed and current chassis

#### Scenario: Flank MP (derived)

- **WHEN** displaying flank MP
- **THEN** flank MP SHALL be `floor(cruiseMP * 1.5)`
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
- **AND** walk/cruise aliases SHALL both match that speed and the existing direct-set flank policy SHALL use that speed
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
