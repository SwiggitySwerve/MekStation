## Why

Interactive weapon attacks emit the same damage-threshold PSR inline and
again at phase close. Auto-resolve relies on the inline producer without a
phase-close scan. Falls also leave hull-down set in the reducer and
runner, allowing contradictory posture and stale hull-down modifiers.

## What Changes

- Preserve the inline damage-threshold producer exactly as on main.
- Make the phase-close producer skip a canonical damage PSR already pending
  for that unit, turn, and phase. Pending entries have no phase fields, so
  correlate the existing canonical reasonCode with trigger-event envelopes.
- Preserve independent weapon/physical phases and the runner dedupe.
- Share a small fall-posture function across the reducer, runner PSR fall,
  and runner DFA miss. Keep facing, damage, and queue handling at each caller.
- Cover auto-resolve threshold emission, repeated phase scans, phase
  separation, unaffected controls, and the C8 turn reset.

## Impact

Affected capability: piloting-skill-rolls. No event type, field, schema-pack,
database, or persisted-format changes. New affected games emit one fewer
duplicate PSR; auto-resolve retains its existing inline trigger. Affected
historical falls derive corrected hull-down state
and may produce different post-state digests. Committed replay fixtures and
golden digests must pass unchanged; any required change stops for Root review.

Rules: MegaMek 48fcb2f64, TWGameManager.java:17837-17891,
TWPhaseEndManager.java:206-209,239-240, Entity.java:2438-2442.

## Non-goals

C6b stuck recovery, movement legality, auto-resolve phase passes or outcomes,
PSR modifiers or resolution timing,
schema changes, and changes to the runner damage-threshold producer.
