# unit-store-architecture Delta — consolidate-equipment-and-hex-duplication

## ADDED Requirements

### Requirement: Force Store Ownership Boundary

The `useForceStore` and `useForcesStore` stores SHALL have distinct, documented
ownership boundaries so the name collision is intentional and bounded. Each
concern SHALL be owned by exactly one store: `useForceStore` SHALL own the
deployment / force-builder concern, and `useForcesStore` SHALL own the campaign
roster concern. The two stores SHALL NOT duplicate the same force-ownership
state, and each store file SHALL document its concern and its boundary against
the other.

#### Scenario: Each force concern has a single owning store

- **GIVEN** force/roster state needs to be read or mutated
- **WHEN** a component selects which store to use
- **THEN** deployment / force-builder state SHALL come only from `useForceStore`
- **AND** campaign roster state SHALL come only from `useForcesStore`.

#### Scenario: Stores document the bounded split

- **GIVEN** the two similarly named stores `useForceStore` and `useForcesStore`
- **WHEN** a contributor inspects either store file
- **THEN** the file SHALL document the concern it owns and the boundary against
  the other store
- **AND** the documented boundary SHALL make the name collision intentional
  rather than accidental.

#### Scenario: No overlapping force-ownership state

- **GIVEN** the deployment and campaign-roster concerns
- **WHEN** the same logical force-ownership fact must be stored
- **THEN** it SHALL be held in exactly one of the two stores
- **AND** the other store SHALL reference it rather than maintaining a divergent
  copy.
