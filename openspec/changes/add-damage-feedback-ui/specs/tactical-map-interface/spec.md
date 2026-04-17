# tactical-map-interface Specification Delta

## ADDED Requirements

### Requirement: Armor Pip Decay Animation

The tactical map interface SHALL animate the transition of armor pips on
the action panel from filled to empty when a `DamageApplied` event lands,
giving the player a visible pulse per hit.

**Priority**: High

#### Scenario: Pip flashes then clears on damage

- **GIVEN** the action panel is showing unit A with 5 armor pips at RA
- **WHEN** a `DamageApplied` event reports 3 armor damage to RA
- **THEN** three rightmost filled pips SHALL flash red at 60% opacity
  for 400ms
- **AND** after the flash the three pips SHALL render empty
- **AND** the 2 remaining pips SHALL stay filled

#### Scenario: Armor then structure animate sequentially

- **GIVEN** 8 damage applied to RA (5 armor, 3 structure)
- **WHEN** the animation runs
- **THEN** armor pips SHALL animate first
- **AND** structure pips SHALL begin animating when the armor animation
  completes
- **AND** total animation time SHALL not exceed 900ms

#### Scenario: Unselected unit's damage does not animate

- **GIVEN** unit B takes damage but the action panel shows unit A
- **WHEN** the `DamageApplied` event fires
- **THEN** the action panel SHALL NOT animate
- **AND** switching selection to unit B after the event SHALL show the
  post-damage state without replaying the animation

### Requirement: Critical Hit Burst Overlay

The tactical map interface SHALL render a short burst animation over a
unit's token when a `CriticalHit` event fires, and the overlay SHALL
auto-dismiss without blocking map interactions.

**Priority**: High

#### Scenario: Crit burst animates over token

- **GIVEN** a `CriticalHit` event for unit-42
- **WHEN** the overlay renders
- **THEN** a burst animation SHALL play centered on unit-42's token for
  ~600ms
- **AND** the overlay SHALL dismiss automatically

#### Scenario: Crit overlay does not intercept clicks

- **GIVEN** the crit burst is visible over a token
- **WHEN** the user clicks on that token
- **THEN** the token click SHALL still register (overlay is
  pointer-events: none)

#### Scenario: Simultaneous crits queue

- **GIVEN** two `CriticalHit` events fire in the same frame for the
  same unit
- **WHEN** the overlays render
- **THEN** the second burst SHALL start after the first completes
- **AND** no more than one burst SHALL be on-screen at a time per unit

### Requirement: Damage Number Floater

The tactical map interface SHALL render a floating red damage number
above each token that takes damage, visualizing the magnitude of hits.

**Priority**: Medium

#### Scenario: Floater appears on damage

- **GIVEN** unit-42 takes 10 damage from a weapon hit
- **WHEN** the floater renders
- **THEN** a red number `"10"` SHALL appear above the token
- **AND** the number SHALL rise upward ~40 pixels over 800ms while
  fading to transparent

#### Scenario: Multiple hits stack vertically

- **GIVEN** a cluster attack that lands 3 hits for 2 damage each
- **WHEN** the floaters render
- **THEN** three floaters SHALL render with 50ms stagger
- **AND** each floater SHALL rise independently

### Requirement: Pilot Wound Flash

The tactical map interface SHALL visually emphasize pilot consciousness
rolls on the action panel's pilot wound track, so the player sees when a
roll fires and how it resolved.

**Priority**: High

#### Scenario: Consciousness roll pulses yellow

- **GIVEN** a `ConsciousnessRoll` event fires for the selected unit's
  pilot
- **WHEN** the wound track renders
- **THEN** the track SHALL pulse yellow for 500ms

#### Scenario: Failed roll shows Unconscious badge

- **GIVEN** a `ConsciousnessRoll` event with `passed = false`
- **WHEN** the wound track renders post-pulse
- **THEN** a persistent red "Unconscious" badge SHALL appear across the
  track
- **AND** the badge SHALL stay until pilot state changes back to
  conscious

#### Scenario: Passed roll leaves no badge

- **GIVEN** a `ConsciousnessRoll` event with `passed = true`
- **WHEN** the wound track renders post-pulse
- **THEN** the yellow pulse SHALL fade
- **AND** no badge SHALL appear
