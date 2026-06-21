# firing-arc-calculation Delta — fix-tactical-map-perf-and-legibility

## ADDED Requirements

### Requirement: Firing Arc Overlay Label Density Bound

The firing-arc overlay SHALL bound the number of per-hex text labels it stamps:
it SHALL render an arc text label only on a bounded representative or boundary
subset of each arc (or as a single per-arc legend entry), not on every in-arc
hex out to weapon maximum range, and SHALL suppress per-hex text labels below a
configured zoom threshold in favor of the arc legend. The bound SHALL NOT change
firing-arc classification, arc legality, hit-location selection, or the per-hex
arc fill and shape area shading — those SHALL continue to be applied to every
in-arc hex exactly as before.

#### Scenario: Long-range wide arc stamps a bounded label count

- **GIVEN** a unit with a weapon whose maximum range classifies several hundred
  hexes in a single arc (for example a 120-degree arc at range 18 to 23)
- **WHEN** the firing-arc overlay renders that arc
- **THEN** the number of per-hex arc text labels SHALL be bounded by a small
  per-arc constant rather than one label per in-arc hex
- **AND** the arc fill and arc shape SHALL still render on every in-arc hex.

#### Scenario: Labels suppressed when zoomed out

- **GIVEN** the firing-arc overlay is visible
- **WHEN** the map zoom is below the configured label-visibility threshold
- **THEN** the overlay SHALL suppress per-hex arc text labels
- **AND** the arc legend SHALL remain available as the arc reference
- **AND** the arc fill and shape SHALL still convey each arc's area.

#### Scenario: Label thinning does not change arc classification

- **GIVEN** the set of hexes classified into each firing arc for a unit
- **WHEN** the overlay thins its text labels to the bounded representative set
- **THEN** the hexes classified into Front, Left, Right, Rear, and out-of-arc
  SHALL be identical to the classification before the label thinning
- **AND** the firing arc used for hit-location selection SHALL be unchanged.
