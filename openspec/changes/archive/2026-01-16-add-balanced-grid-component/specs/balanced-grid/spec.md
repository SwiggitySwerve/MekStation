## ADDED Requirements

### Requirement: Balanced Row Distribution Algorithm
The BalancedGrid component SHALL calculate optimal column count to distribute items evenly across rows.

#### Scenario: Perfect division preferred
- **WHEN** 10 items need to wrap and container fits max 8 columns
- **THEN** algorithm chooses 5 columns for 5+5 split
- **AND** algorithm does NOT choose 6 columns (which would give 6+4)

#### Scenario: Three-row perfect division
- **WHEN** 9 items need to wrap and container fits max 6 columns
- **THEN** algorithm chooses 3 columns for 3+3+3 split
- **AND** three perfect rows beats 5+4 two-row split

#### Scenario: Single row when all fit
- **WHEN** 8 items need layout and container fits all 8
- **THEN** algorithm chooses 8 columns for single row
- **AND** no wrapping occurs

#### Scenario: Scoring formula
- **WHEN** calculating optimal columns
- **THEN** score = (difference × 2) + (rows × 0.5)
- **AND** lower score wins
- **AND** difference = columns - itemsInLastRow

### Requirement: Container Width Measurement
The useBalancedGrid hook SHALL measure container width after DOM paint.

#### Scenario: Post-paint measurement
- **WHEN** component mounts
- **THEN** measurement occurs inside requestAnimationFrame callback
- **AND** this ensures offsetWidth returns actual rendered width

#### Scenario: Responsive updates
- **WHEN** container width changes
- **THEN** ResizeObserver triggers recalculation
- **AND** column count updates automatically

#### Scenario: Zero width handling
- **WHEN** container has zero width (not yet rendered)
- **THEN** ready state remains false
- **AND** fallback grid template is used

### Requirement: Child Counting Accuracy
The BalancedGrid component SHALL accurately count only valid React children.

#### Scenario: Conditional children excluded when false
- **WHEN** children include `{condition && <Child/>}` with condition=false
- **THEN** the false value is NOT counted as a child
- **AND** itemCount reflects only rendered elements

#### Scenario: Null and undefined excluded
- **WHEN** children include null or undefined values
- **THEN** these are NOT counted as children
- **AND** itemCount reflects only rendered elements

#### Scenario: Uses Children.toArray
- **WHEN** counting children
- **THEN** component uses `Children.toArray(children).length`
- **AND** NOT `Children.count(children)` which counts falsy values

### Requirement: Fallback Grid Template
The BalancedGrid component SHALL provide a fallback template before calculation is ready.

#### Scenario: SSR/initial render
- **WHEN** ready state is false
- **THEN** grid uses fallback template
- **AND** default fallback is `repeat(auto-fill, minmax(${minItemWidth}px, 1fr))`

#### Scenario: Custom fallback
- **WHEN** fallbackColumns prop is provided
- **THEN** that template is used instead of default
- **AND** this allows layout hints for SSR

#### Scenario: Calculated template
- **WHEN** ready state is true and columns > 0
- **THEN** grid uses `repeat(${columns}, 1fr)`
- **AND** this forces exact column count

### Requirement: Configuration Props
The BalancedGrid component SHALL accept configuration for layout calculation.

#### Scenario: minItemWidth configuration
- **WHEN** minItemWidth prop is set to 75
- **THEN** algorithm uses 75px as minimum item width
- **AND** maxColumns = floor((containerWidth + gap) / (minItemWidth + gap))

#### Scenario: gap configuration
- **WHEN** gap prop is set to 6
- **THEN** grid uses 6px gap between items
- **AND** gap is included in column count calculation

#### Scenario: gap default
- **WHEN** gap prop is not provided
- **THEN** default gap of 4px is used

#### Scenario: className passthrough
- **WHEN** className prop is provided
- **THEN** classes are applied to grid container
- **AND** can be used for responsive gap overrides (e.g., `sm:gap-1.5`)
