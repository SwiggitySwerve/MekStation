## ADDED Requirements

### Requirement: Force swap result feedback

The force detail page SHALL show swap feedback that reflects the force store's result, including after refreshing force details.

#### Scenario: Failed assignment swap

- **GIVEN** the user selects two assignment slots to swap
- **WHEN** the force store reports failure
- **THEN** the page SHALL show an error toast stating that the assignments could not be swapped
- **AND** refreshing the force details SHALL NOT suppress that feedback

#### Scenario: Successful assignment swap

- **GIVEN** the user selects two assignment slots to swap
- **WHEN** the force store reports success
- **THEN** the page SHALL refresh force details and show a success toast
