# Issues — repair-broken-encounter-drafts

## [2026-05-08 18:30] Session interrupted — partial delivery
**State**: PR1 (#558) opened, CI in progress. PR2 and PR3 not started. Worktree at `.claude/worktrees/repair-pr1-cleanup` left in place with branch `feat/repair-encounters-pr1-cleanup`.

**Why partial**: User-level Claude PostToolUse hook at `~/.claude/hooks/auto-format.sh` runs `npx prettier --write` on every Edit, but this project uses `oxfmt` (single quotes) — prettier defaults to double quotes. Each Edit reformatted entire files to double-quote style and re-printed the FULL file in the system reminder, causing 5-10x context multiplication per edit. Hard to push through 3 PRs end-to-end at that rate.

**Mitigation for the next session**: either (a) suspend the auto-format hook globally while running PR2/PR3, or (b) lean on Write tool (single hook trigger per file) and follow each Write/Edit with `npx oxfmt --write <file>` to repair, or (c) delegate PR2/PR3 to omo-hephaestus via the Task tool (subagents do not inherit the user-level hook? — verify first).

## [2026-05-08 18:30] Worktree state
- `.claude/worktrees/repair-pr1-cleanup/` — PR1 branch (committed + pushed). Clean to delete after PR1 merges (`git worktree remove --force`).
- Main repo `E:/Projects/MekStation` — clean (only known-untracked entries).
