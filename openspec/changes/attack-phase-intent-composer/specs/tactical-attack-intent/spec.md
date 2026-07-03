# tactical-attack-intent (delta)

Delta for `attack-phase-intent-composer`: new capability specifying the intent-first weapon-attack flow — compose the volley as weapon→target assignments, total consequences live, block illegal assignments at the source, and commit the whole volley with an explicit Fire. Attack rules (`to-hit-resolution`, `secondary-target-tracking`, `weapon-resolution-system`, `heat-management-system`) are consumed verbatim.

## ADDED Requirements

### Requirement: Attack Intent Composition

During the weapon-attack phase the active player SHALL compose a volley as attack intent items — weapon→target assignments with per-weapon fire modes, plus the torso-twist intent (per the Torso Twist Intent requirement) — on a single planning surface before anything commits. Composition SHALL have a zero-commit guarantee: no declaration enters the resolution pipeline until the explicit Fire commit.

**Priority**: Critical

#### Scenario: Composing assigns without declaring

- **GIVEN** the active unit has three operable weapons and an enemy in arc
- **WHEN** the player assigns two weapons to the enemy in the composer
- **THEN** no attack declaration SHALL exist in the resolution pipeline
- **AND** the composed assignments SHALL be visible as intent items

### Requirement: Target Assignment with Primary/Secondary Surfacing

Target assignment SHALL be target-first (ADR 0002 D6): clicking an enemy focuses it as the working target, and weapon toggles assign against the focused target. The first target assigned in the composed volley SHALL be the primary target; assigning any weapon to a different (focused) target SHALL immediately display that weapon's secondary-target penalty inline (penalty values per `secondary-target-tracking`, consumed as-is). Reassigning all weapons off a target SHALL remove it from the volley.

#### Scenario: Target-first focus drives weapon toggles

- **GIVEN** the composer is active with no assignments
- **WHEN** the player clicks enemy A and toggles two weapons, then clicks enemy B and toggles a third
- **THEN** the two weapons SHALL be assigned against A (primary) and the third against B (secondary)
- **AND** no weapon assignment SHALL change targets without B being the focused target at toggle time

#### Scenario: Second target shows secondary penalty at assignment

- **GIVEN** weapons assigned to enemy A (primary)
- **WHEN** the player assigns a weapon to enemy B
- **THEN** that weapon's row SHALL display the secondary-target penalty before any commit
- **AND** the ledger's volley probability SHALL reflect the penalized to-hit

### Requirement: Weapon Palette Legality at Source

The weapon palette SHALL block illegal assignments at the source with the rules-backed reason: destroyed weapons, empty ammo, out-of-arc, out-of-range, and no-LOS states SHALL be unassignable, each labeled with its reason. Fire-mode selection (e.g. cluster/slug, ultra rates) SHALL occur in-palette and re-derive that weapon's forecast row.

#### Scenario: Out-of-arc weapon blocked with reason

- **GIVEN** a rear-mounted weapon whose arc excludes the assigned target
- **WHEN** the palette renders
- **THEN** that weapon SHALL be unassignable to the target
- **AND** its row SHALL name the arc restriction as the reason

### Requirement: Torso Twist Intent

Torso twist SHALL be a composer intent item (ADR 0002 D7): setting or changing the twist within the composer SHALL recompute arc feasibility live across all weapon rows and target encodings, and clearing the twist SHALL restore the prior gating exactly. Twist legality and arc math are consumed from the existing torso-twist rules verbatim. Assignments made legal only by the composed twist SHALL be blocked at the source again if the twist is removed.

#### Scenario: Twist unlocks an arc live

- **GIVEN** a rear-arc enemy that no assigned weapon can currently bear on
- **WHEN** the player composes a torso twist toward that enemy
- **THEN** the affected weapon rows SHALL become assignable against it without any commit
- **AND** removing the twist SHALL re-block those rows at the source

### Requirement: Heat and Effect Ledger

The composer SHALL total the composed volley live: heat generated on top of banked movement heat, expected damage, and hit probabilities per weapon and for the volley, derived from the existing to-hit forecast calculators. Threshold consequences (shutdown risk, ammo-explosion exposure) SHALL be displayed when the composed heat crosses them.

#### Scenario: Ledger updates as assignments change

- **GIVEN** a composed volley generating 12 heat over 10 dissipation
- **WHEN** the player removes a 4-heat weapon from the volley
- **THEN** the ledger heat total SHALL update to 8 without a commit
- **AND** any threshold chip no longer applicable SHALL clear

### Requirement: Live Feasibility Gating Never Blocks Heat

Rules-illegal assignments SHALL be blocked at the source; legal-but-hot compositions SHALL NEVER be blocked — heat is a strategic resource and the composer SHALL display overheat consequences instead of forbidding them. The composer SHALL never auto-deselect an assigned weapon.

#### Scenario: Overheating volley stays composable

- **GIVEN** a composed volley that would push the unit past a shutdown-risk threshold
- **WHEN** the ledger renders
- **THEN** the volley SHALL remain composable and fireable
- **AND** the shutdown-risk consequence SHALL be displayed

### Requirement: Volley Resolver and Explicit Fire

The resolver SHALL present the composed volley's summary and consequences, and an explicit Fire control SHALL commit the whole volley atomically into the existing attack-declaration pipeline. The composer SHALL never auto-fire. Declining to attack SHALL be an explicit Hold Fire. Fire SHALL be disabled with a player-facing hint until at least one legal assignment exists.

#### Scenario: Fire commits the whole volley atomically

- **GIVEN** three weapons assigned across two targets
- **WHEN** the player activates Fire
- **THEN** all three declarations SHALL enter the resolution pipeline as one committed volley
- **AND** the resulting declarations SHALL be identical to the same volley built through the legacy flow

#### Scenario: Hold Fire is explicit

- **GIVEN** an empty composed volley
- **WHEN** the player ends their attack activation
- **THEN** the pass SHALL be an explicit Hold Fire action, not a silent timeout

### Requirement: Single Attack Authority

While the composer is active it SHALL be the sole weapon-attack declaration surface: dock weapon commands and enemy-token context menus SHALL route into composer state rather than mutating the attack plan directly, and no secondary surface SHALL commit declarations.

#### Scenario: Context menu routes into the composer

- **GIVEN** the composer is active with no assignments
- **WHEN** the player uses an enemy token's context-menu attack command
- **THEN** the result SHALL be a composer target assignment
- **AND** no declaration SHALL be committed by the menu action itself
