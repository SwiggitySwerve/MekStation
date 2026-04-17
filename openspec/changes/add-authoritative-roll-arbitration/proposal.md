# Change: Add Authoritative Roll Arbitration

## Why

**Sub-phase 4b.** Once the server runs the canonical session, all dice
rolls must originate there. Otherwise a malicious client could forge a
"boxcars" hit-location roll or a "snake eyes" shutdown save. BattleTech
has many roll sources (initiative 2d6, to-hit 2d6, cluster hits 2d6, hit
location 2d6, crit rolls 2d6, consciousness 3+ targets, shutdown 4+
targets, fall PSRs). All of them need to run server-side and be embedded
in the resulting events so clients display the same outcome the server
saw. This change formalizes a server-only `DiceRoller` contract and a
"rolls embedded in events" rule that makes replay trivial and forgery
impossible.

## What Changes

- `multiplayer-server` spec adds an "authoritative RNG" requirement:
  server generates all randomness; no client intent carries dice values
- Server's `DiceRoller` uses Node's `crypto.randomBytes` (not
  `Math.random`) to produce unbiased rolls
- Each event whose resolution consumed dice SHALL carry a `rolls: number[]`
  array on its payload, in the order consumed
- `dice-system` spec's existing "injectable DiceRoller" pattern is
  reused — server wires its crypto-backed roller; clients ignore any
  local roller and purely render rolls from event payloads
- Intent messages that include dice values are rejected as malformed
- Seeded RNG is available via an admin/debug flag for reproducing
  specific bug reports but is off by default

## Dependencies

- **Requires**: `add-multiplayer-server-infrastructure` (server
  transport + session host), existing `dice-system`,
  `game-session-management`
- **Required By**: `add-multiplayer-lobby-and-matchmaking-2-8`,
  `add-fog-of-war-event-filtering` (fog filtering must trust the
  resolved rolls)

## Impact

- Affected specs: `multiplayer-server` (MODIFIED — adds roll authority
  requirement), `game-session-management` (MODIFIED — requires `rolls`
  on randomness-consuming events for all networked matches),
  `dice-system` (MODIFIED — defines a crypto-backed `DiceRoller` factory
  and a strict "rolls must be recorded" rule on resolved events)
- Affected code: new `src/server/multiplayer/serverDiceRoller.ts`,
  extension of `src/utils/gameplay/dice.ts` to export an
  event-recording wrapper, extension of all phase resolvers to record
  the dice consumed on each event
- Non-goals: verifiable dice (commit-reveal cryptography), dice streams
  shared over hash chains, client-side anti-tamper. Trust boundary is
  "the server binary"
