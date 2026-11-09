# Recover from replay load failures

## Why

The standalone replay page records missing and failed match-log loads without
showing them. Users see an empty replay prompt, and timeline failures offer no
retry action.

## What Changes

- Show an accessible missing or failed replay banner with a Retry action.
- Retry the match-log read and refresh the browser timeline, with visible pending
  feedback and one retry request at a time.
- Ignore superseded responses, including JSON parsing that finishes after
  navigation, and keep a usable direct replay visible during timeline failures.
- Preserve upload precedence and restore the existing prior source when an
  upload is cleared. Keep file upload available after a load failure.

## Impact

Extends [quick-session](../../specs/quick-session/spec.md). Changes only the
standalone replay route, its state presentation, and its existing component
test suite. Quick-game embedded replay and replay-library viewers are unchanged.
No engine, reducer, schema pack, event payload, persisted format, or authority
changes are included. One PR; Root owns merging.
