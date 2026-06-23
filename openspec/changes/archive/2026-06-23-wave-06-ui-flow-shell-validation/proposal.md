# Wave 6: UI Flow Shell Validation

## Summary
Make the gameplay UI flow shell directly inspectable and stricter to validate, so the player/GM route sequence for each required journey can be checked on demand and kept aligned with the journey runner.

## Motivation
The gameplay hub already renders the required journey-backed flow shell, but the QC surface only validates it indirectly through `qc:journeys:validate`. Wave 6 needs a focused command that answers "what UI route sequence proves this journey?" and fails fast when a route checkpoint or required sequence drifts.

## Scope
- Add a dedicated UI flow shell inspection command.
- Validate ordered required checkpoints for each required journey.
- Keep route-template validation tied to existing Next.js pages.
- Include the UI flow shell gate in the aggregate QC verification path.

## Out Of Scope
- Browser-driving every checkpoint.
- Redesigning gameplay hub navigation.
- Implementing post-combat or economy correction runtime behavior.
