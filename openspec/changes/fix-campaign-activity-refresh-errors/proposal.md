# Preserve campaign activity after refresh failures

## Why

A failed activity refresh replaces previously loaded authoritative entries with an empty error result. Both display surfaces then hide the history the user already loaded.

## What Changes

- Retain previously loaded entries and viewer seat on transient refresh errors for the same campaign/session/participant key.
- Show the refresh warning alongside the retained rows in both the dashboard and full activity log.
- Clear cached entries on forbidden responses and key changes, including the first render under a new key.

## Impact

- Affected spec: `coop-campaign-sync`.
- Affected code: the activity feed hook, shared display adapter, dashboard activity card, full activity log, and existing tests.
- No schema, persistence, gameplay, server authority, or mission-launch changes.
