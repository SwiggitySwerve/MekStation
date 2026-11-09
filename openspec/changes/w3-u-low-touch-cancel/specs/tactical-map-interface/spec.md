## ADDED Requirements

### Requirement: Cancelled map touch gestures

The tactical map SHALL clear active pan, pinch, and touch rotation bookkeeping when the browser cancels a touch gesture.

#### Scenario: Cancel a pan

- **GIVEN** a touch pan is active
- **WHEN** the SVG receives touch cancellation
- **THEN** subsequent touch moves without a fresh touch start SHALL leave the camera unchanged
- **AND** a fresh touch gesture SHALL pan normally

#### Scenario: Cancel a pinch or rotation

- **GIVEN** a two-finger pinch or rotation has started
- **WHEN** the SVG receives touch cancellation
- **THEN** subsequent touch moves without a fresh touch start SHALL leave zoom and rotation unchanged
- **AND** a fresh two-finger gesture SHALL work normally
