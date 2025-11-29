# core-entity-types Specification

## Purpose
TBD - created by archiving change implement-phase1-foundation. Update Purpose after archive.
## Requirements
### Requirement: Base Entity Interface
All entities in the system SHALL extend from IEntity, providing universal identification.

#### Scenario: Component creation
- **WHEN** a new component is being created
- **THEN** it MUST extend IEntity
- **AND** provide unique id property
- **AND** provide name property

### Requirement: Tech Base Classification
All components and equipment SHALL implement ITechBaseEntity to declare their tech base.

#### Scenario: Tech base declaration
- **WHEN** a component is defined
- **THEN** techBase MUST be TechBase.INNER_SPHERE or TechBase.CLAN
- **AND** rulesLevel MUST be specified

### Requirement: Physical Properties
Components with physical characteristics SHALL implement appropriate interfaces (IWeightedComponent, ISlottedComponent).

#### Scenario: Weight calculation
- **WHEN** a component with weight is implemented
- **THEN** it MUST implement IWeightedComponent
- **AND** provide weight in tons as a number >= 0

### Requirement: Composition Pattern
Components with both weight and slots SHALL use IPlaceableComponent composition.

#### Scenario: Equipment definition
- **WHEN** equipment requires both weight and slots
- **THEN** it SHALL extend IPlaceableComponent
- **AND** automatically inherit weight and criticalSlots

### Requirement: Economic Properties
Components with economic value SHALL implement IValuedComponent.

#### Scenario: Component pricing
- **WHEN** a component has monetary cost
- **THEN** it MUST provide cost in C-Bills >= 0
- **AND** battleValue >= 0

### Requirement: Temporal Properties
Components with introduction dates SHALL implement ITemporalEntity.

#### Scenario: Era filtering
- **WHEN** a component is introduced in a specific year
- **THEN** it MUST provide introductionYear
- **AND** MUST provide era classification

### Requirement: Documentation Properties
Components with source references SHALL implement IDocumentedEntity.

#### Scenario: Source tracking
- **WHEN** a component from official source material is defined
- **THEN** it SHOULD provide sourceBook
- **AND** SHOULD provide pageReference

