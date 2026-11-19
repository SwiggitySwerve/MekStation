# Unfixed Swamp Continuation With Later Rolls

This additive capture preserves a real unfixed-writer battle with combat
after its infinite-target swamp resolution. The earlier pending and
completed swamp captures remain unchanged.

Source: detached origin/main
`c33afb8cb7eed3425eacee707648ff5203d75e6f`. Before capture, the factory
still produced `fixedTargetNumber: Number.POSITIVE_INFINITY`, and the
resolver still called `roll2d6` for that check. The reference install was
compared read-only with the checkout lockfile; the exact verdict is saved.

The game uses seed 8, canonical Atlas AS7-D vs Marauder MAD-3R, gunnery
2/piloting 5, radius 7 and turn limit 30. Only the hex directly forward of
player deployment is swamp level 2. The player enters it in turn 1. The
production session resolves the check at End with its actual seeded roll.
Play continues through all phases of turns 2 and 3, with two low-damage,
in-range forward weapons selected per side in each weapon phase. Holding
movement keeps the combat tail repeatable. The production movement-start
swamp recovery also supplies later PSR rolls. Concession occurs only after
the session reaches turn 4.

The capture uses `InteractiveSession` with exactly the constructor/seed
wiring of `GameEngine.createInteractiveSession`, adding a transparent
injected-d6 observer. The observer calls the real `SeededD6Roller(8)` once
and returns its unchanged value. Movement, attacks, every phase resolver,
storage and concession all use production paths. No source rules, event
payloads or cached state are patched.

## Evidence Files

- `.ndjson`: the entire production event history, one
  `JSON.stringify(event)` per line with final LF.
- `.events.raw-json`: the original `JSON.stringify(events)` array. The
  infinite trigger/resolution targets become null; rolls are retained.
- `.v8`: original session and actual persisted match-log rows, preserving
  positive Infinity. The production store is closed/reopened before its
  rows are captured and compared with the live session events.
- `.rolls.raw-json`: every injected d6 value in original consumption order,
  caller stack frames, command boundaries, the swamp resolution's boundary,
  all later d6 values, and later dice-bearing event payloads. This retains
  adapter-discarded draws too; it does not infer dice from recorded sums.
- `.command-states.v8`: live state snapshots after each public command,
  with event/dice counts. These are command boundaries, not a claim to
  have intercepted every internal event boundary.
- `.install-verdict.txt`: read-only compare-lock output.
- `.provenance.json`: source/branch start SHAs, capture UTC from `date -u`,
  setup, writer and capture-recipe hashes, artifact SHA-256, actual combat
  counts and terminal sequence.
- `.provenance.raw-json`: the original metadata bytes before repository
  JSON formatting. The `.json` manifest has identical values and formatted
  presentation; all source recordings, dice and state artifacts are unchanged.
- `.capture.recipe.txt`: the exact source executed during capture, matching
  `captureHelperSha256`. The executable test later strengthened its new
  stack-frame check to use the captured source call sites and compare
  to-hit dice pairs and hit-location draw counts. Capture logic, recordings
  and provenance were preserved.

Observed capture: 80 events; swamp roll 9 at sequence 19; full later turns
2 and 3; 8 later weapon resolutions with 5 hits; two finite swamp-recovery
PSRs (rolls 6 and 7); 38 later individual d6 draws; 24 live command-state
snapshots; terminal `GameEnded` at sequence 79 in turn 4.

## Focused Capture and Verification

```text
node E:/Projects/Personal/_scratch/census-slots/mem-guard.mjs -- node node_modules/jest/bin/jest.js --selectProjects unit --runTestsByPath src/lib/events/replay/__fixtures__/legacy-psr-unfixed/deep-swamp-continuation.capture.test.js --maxWorkers=1
```

Normal runs are read-only. They verify all artifact hashes, exact JSON vs
original object recordings, real later hits in both complete turns,
additional PSRs, the entire live d6 trace against its seed, and original
event folding against every captured command state through `GameEnded`.

The one-time capture runs that file with
`CAPTURE_UNFIXED_SWAMP_CONTINUATION=1` only in the pinned detached checkout.
It verifies source/install prerequisites and refuses to overwrite evidence.
It writes no files until the two-turn combat-tail requirements pass.

The canonical legacy-read acceptance list names this fixture for the future
adapted replay-to-end proof. That proof must compare all later recorded
rolls and retained live d6 consumption with this unfixed reference, and
must catch skipped or duplicate consumption of the historical swamp roll.
The capture-only tests do not implement adaptation or claim that its
acceptance proof already passes. Preserve these captures; never regenerate
them using the fixed writer.
