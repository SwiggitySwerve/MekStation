## Launch ownership

Each pre-battle hook owns one in-flight ref. The ref is acquired before asynchronous work and released in finally after navigation settles. React busy state continues to drive buttons. Navigation returning false is a failure; thrown failures retain the existing error-message handling. Existing recovery, explicit `{ restart: true }` linkage, completion, outcome publication, and store publication order remain unchanged.

## Persistence ownership

The game-session lifecycle owns separate maps of session ID to pending, saved, or failed status. Missing entries mean no attempt. Entries are claimed synchronously before asynchronous imports, so rerenders and effect replay cannot create duplicate submissions. Callbacks update the captured session's entry. A failed attempt remains failed without causing a render-driven retry loop. Existing toast helpers report failures even when the game page has navigated to victory. Encounter completion stays guarded by completed session status.

## Compatibility

No persistent storage shape changes. Maps live only for the mounted page lifetime. Victory navigation remains independent of persistence. Other launchers, AI, engine phases, multiplayer dispatch/journals, P2P translation, and the standalone simulation runner do not invoke the pre-battle hooks; their completed sessions can still use the unchanged game-page lifecycle entry contract.
