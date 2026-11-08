## Why

Both heat resolvers allow startup before an EMP shutdown expires and perform
another shutdown check after attempting startup. The standalone runner also
never decrements the EMP shutdown timer. KO pilots can pass rolled startup.

## What Changes

- Extract startup eligibility and the existing session EMP countdown unchanged.
- Gate startup until EMP rounds reach zero, share countdown with the runner,
  and choose startup or shutdown checking once from the pre-startup state.
- Auto-fail required startup rolls for KO pilots; retain automatic low-heat
  startup. Use `HEAT_THRESHOLDS.AUTO_SHUTDOWN` for the existing heat ceiling.
- Preserve event payloads, persisted formats, and recorded startup outcomes.

## Impact

Capability: shutdown-startup-system. Rules follow MegaMek
`48fcb2f64a1b3f2d575707ce5653dad64927b587`; see
`src/utils/gameplay/shutdownStartup.RULES.md` for source citations.
New execution and recovered-session continuation can consume fewer dice and
change outcomes, including thermal shutdowns without EMP. Recorded event
journals replay unchanged because `StartupAttempt.success` is authoritative.
Any changed committed fixture, digest, seeded snapshot, or exact-roll seeded
expectation stops the lane for Root's decision; none may be regenerated.

## Non-goals

Replay migrations, payload/schema-pack changes, EMP presentation, construction,
catalog data, BV, other state-machine items, or merging the PR.
