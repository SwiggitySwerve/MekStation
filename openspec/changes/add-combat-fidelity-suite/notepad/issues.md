# Notepad — Issues

Problems hit and how they were solved.

## [2026-05-06] P0.5 — `forfeit` / `withdrawal` flags are placeholder-only at runner-side

**Issue**: `determineMatchTerminalState({ ..., hadForfeit, hadWithdrawal })` accepts both flags, and `SimulationRunner.run()` always passes `false` for both. The runner does not yet emit forfeit / withdrawal commands — `add-bot-retreat-behavior` (Tier 5, archived) introduced retreat behavior on the bot but no event-stream signal that a side has voluntarily withdrawn. Until P1+ catalog hydration surfaces the per-unit retreat-fate or per-side concede signal, the only reachable values from the runner are `player_victory`, `opfor_victory`, `mutual_destruction`, `timeout`, and `draw`.

**Resolution**: Document the placeholder explicitly. The classifier supports the full 7-value taxonomy, the type is correct, and the unit tests cover all 7 branches via direct invocation. A follow-on PR (likely after P1) wires the runner to compute the flags from match state.

**Reference**: `src/simulation/runner/SimulationRunner.ts:218-241` — see the inline `// Phase 0.5 — engine-layer match terminal state` comment block.

## [2026-05-06] P0.5 — oxfmt PostToolUse hook double-quotes drift

**Issue**: Every Edit / Write fired the PostToolUse hook which ran `oxfmt` with default config (DOUBLE quotes), reformatting whole files away from the project's `singleQuote: true` rule. Initial edits showed massive (170+ line) diffs that were 99% quote-style noise.

**Resolution**: After every Edit, run `npx oxfmt --write <file>` to reformat with the project config (`.oxfmtrc.json`). Diffs collapse from ~170 lines back to the actual surgical change. No infrastructure fix needed — workflow change only. Documented in `learnings.md` so future agents don't re-hit it.

