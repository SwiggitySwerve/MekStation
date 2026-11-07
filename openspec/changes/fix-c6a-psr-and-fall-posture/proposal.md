## Why

Interactive weapon attacks emit the same damage-threshold PSR inline and
again at phase close. Falls also leave hull-down set in the reducer and
runner, allowing contradictory posture and stale hull-down modifiers.

## What Changes

- Remove the inline damage-threshold producer and its unused pre-damage input.
- Keep the existing phase-close producer and runner dedupe unchanged.
- Share a small fall-posture function across the reducer, runner PSR fall,
  and runner DFA miss. Keep facing, damage, and queue handling at each caller.
- Cover phase separation, unaffected controls, and the C8 turn reset.

## Impact

Affected capability: piloting-skill-rolls. No event type, field, schema-pack,
database, or persisted-format changes. New affected games emit one fewer
duplicate PSR; affected historical falls derive corrected hull-down state
and may produce different post-state digests. Committed replay fixtures and
golden digests must pass unchanged; any required change stops for Root review.

Rules: MegaMek 48fcb2f64, TWGameManager.java:17837-17891,
TWPhaseEndManager.java:206-209,239-240, Entity.java:2438-2442.

## Non-goals

C6b stuck recovery, movement legality, PSR modifiers or resolution timing,
schema changes, and changes to the runner damage-threshold producer.
