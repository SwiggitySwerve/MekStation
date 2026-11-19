/**
 * Test files allowed to append onto a game session the event-log owner did
 * not produce (src/__tests__/helpers/unownedAppendGuard.ts). Each entry is a
 * repo-relative test file path; reason: hand-built fixture (the file builds
 * `currentState`, `events` or a whole session by hand, then appends, which
 * main silently refolds). Rewrite a setup through createGameSession /
 * hydrateGameSessionFromEvents / appendEvent to take its file off the list.
 */
export const UNOWNED_APPEND_ALLOWED_TEST_FILES: readonly string[] = [];
