# Git Hooks — Team & Personal

Two layers of git hooks operate in MekStation:

1. **Team-shared hooks** — managed by [husky](https://typicode.github.io/husky/) at `.husky/pre-commit`. Auto-install via `npm install` (postinstall script). Required for every contributor; same behaviour for everyone.
2. **Personal hooks** — managed via [Git 2.54 config-based hooks](https://github.blog/open-source/git/highlights-from-git-2-54/). Set in your `~/.gitconfig` or per-repo `.git/config`. Do not affect teammates.

The two layers compose: husky's script hooks fire **alongside** Git config hooks. Use husky for shared concerns, config hooks for personal augmentations.

---

## Team layer (husky)

Source: [`.husky/pre-commit`](../../.husky/pre-commit). Auto-installed via `npm install`.

Current behaviour:

| Step | Action                                                                                                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `npx lint-staged --no-stash` runs `oxlint --fix` and `oxfmt --write` on staged `.ts` / `.tsx` / `.js` / `.jsx` files, and `oxfmt --write` on staged `.json` / `.md` / `.css` files |
| 2    | When any `.ts` / `.tsx` file is staged, lint-staged ends with `bash -c 'npm run typecheck'`, which checks both root and scripts projects with TypeScript 7                         |

The `bash -c` wrapper keeps staged filenames out of the compiler arguments so both checks use their tsconfig files.

The hook runs `npx lint-staged --no-stash`, so lint-staged takes no backup stash.

- **Why:** linked worktrees share one stash stack. lint-staged applies or drops its backup by an index it looked up just before, so a stash made in another worktree in between could make it drop someone else's entry.
- **Trade-off:** if a task fails, the edits it made stay in the working tree rather than being reverted.
- **Test:** `scripts/__tests__/precommit-no-build.test.ts` traces the git commands the hook runs and fails if any of them uses `stash`.
- **Not implied:** `--no-stash` does not turn off lint-staged's hiding of the unstaged part of a partially staged file. That is a separate option (`--hide-partially-staged`), on by default. lint-staged's type declarations say otherwise; its command-line code does not.

Before lint-staged, the hook runs `node scripts/lib/check-partial-stage.mjs` for worktrees on a different drive from their git directory, such as a linked worktree on `C:` of a repository on `E:`.

- **Why:** lint-staged hides an unstaged edit by writing it to a patch inside the git directory, then resetting the file. It builds the patch path from a relative path to the git directory (`lib/resolveGitRepo.js:56-57`). Across drives that path is absolute, so the write fails. lint-staged still resets the file, and the unstaged edit is lost with no backup. lint-staged 16.2.7 and 17.6.0 both do this.
- **In such a worktree:** a commit with a partially staged file is refused before lint-staged runs. The message names the files and gives the two ways out: stage the whole file, or move the unstaged edit aside, commit, and put it back. With no partially staged file, the hook passes `--no-hide-partially-staged`, so the failing patch step never runs.
- **Everywhere else**, the script prints nothing, and lint-staged keeps its default: a partially staged file is committed with its staged part only.
- **Not `--no-hide-partially-staged` everywhere:** with that flag, lint-staged commits the whole working-tree file, including the hunks you did not stage.
- **Do not bypass the refusal with `--no-verify`.** The check is what protects the unstaged edit.
- **Test:** `scripts/__tests__/precommit-partial-stage.test.ts`.

The hook runs no production build (owner decision of 2026-09-23, roadmap unit U62). The pr-checks workflow runs `npm run build` on every pull request that changes code, together with the lint, format, type and test gates.

A commit made in a linked `git worktree` runs no hook at all. Husky's hooks folder, `.husky/_`, exists only in the checkout where `npm install` ran.

**Don't bypass with `--no-verify`** unless you have an explicit reason.

---

## Personal layer (Git 2.54 config hooks)

Requires `git --version` ≥ 2.54.

### Inspect what's active

```sh
git hook list pre-commit
git hook list pre-push
```

Output shows scope (`global` / `local`) and the command. Husky scripts at `.git/hooks/*` are NOT shown by `git hook list` but DO still execute — they're a separate mechanism that supplements the config hooks.

### Recipe 1 — Block commits containing merge conflict markers

```sh
git config --global hook.no-merge-markers.event pre-commit
git config --global hook.no-merge-markers.command "! git diff --cached --check"
```

### Recipe 2 — Spell-check commit messages

Requires [`cspell`](https://cspell.org) installed.

```sh
git config --global hook.spellcheck-msg.event prepare-commit-msg
git config --global hook.spellcheck-msg.command "cspell-cli --no-color --no-summary --no-progress \"\$1\""
```

### Recipe 3 — Block secrets in staged content

Requires [`gitleaks`](https://gitleaks.io) installed.

```sh
git config --global hook.no-secrets.event pre-commit
git config --global hook.no-secrets.command "gitleaks protect --staged --no-banner"
```

### Recipe 4 — AI-slop heuristic check

Catches common AI-generated phrasings that shouldn't make it into code or docs.

```sh
git config --global hook.ai-slop-check.event pre-commit
git config --global hook.ai-slop-check.command \
  "if git diff --cached | grep -qE \"I'll help you|here's a comprehensive|Let me create|I'll create a\"; then echo 'Possible AI-slop pattern detected'; exit 1; fi"
```

### Recipe 5 — Surface triangular state on `git status`

Not a hook, but a related Git 2.54 win. Shows distance from BOTH upstream and push remote — useful for sequential-rebase workflows where main moves between merges.

```sh
git config --global status.compareBranches both
```

### Disabling temporarily

```sh
git -c hook.no-merge-markers.enabled=false commit -m "..."
```

Or globally:

```sh
git config --global hook.no-merge-markers.enabled false
```

---

## Decision rubric

| Need                                                                            | Use                                                                   |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Hook the whole team must run                                                    | husky (shared, auto-installs via `npm install`)                       |
| Hook tied to project-specific tooling (`lint-staged`, the project's type check) | husky                                                                 |
| Hook that fails CI gates                                                        | CI workflow, not a local hook (any local hook can be `--no-verify`'d) |
| Personal preference (your spell-check, your secret scan)                        | Git 2.54 config hook in `~/.gitconfig`                                |
| Org-wide hook required across all your repos at $COMPANY                        | Git 2.54 config hook in `~/.gitconfig`                                |

---

## When to migrate off husky

Not yet. Husky's auto-install on `npm install` is the team-onboarding ergonomic that Git 2.54 doesn't replicate without scripting. If we ever drop the `npm install` flow (e.g., monorepo move, npm-less tooling), revisit.

The genuinely better Git 2.54 features for shared use — `git hook list` discoverability, per-event composition without shell — would only justify migration if husky becomes a maintenance liability. It hasn't.

---

## Troubleshooting

**My personal config hook isn't firing**

- `git --version` ≥ 2.54?
- `git hook list pre-commit` — does it appear?
- `git hook run pre-commit` — does it execute when invoked manually?
- The hook command's stdout/stderr go to git's stderr — check for shell-escaping issues with quotes

**Husky pre-commit isn't running**

- `cat .git/hooks/pre-commit` — does the husky shim exist?
- `npm install` re-runs the husky `prepare` script and re-installs the hook
- Check `.husky/_/` exists — that's husky's runtime support directory

**Lint-staged stash-restore corrupts working tree**
Known husky+lint-staged issue. Recovery:

1. `git stash list` — find the lint-staged backup stash
2. `git restore .` and `git clean -fd` to clear partial state
3. `git stash pop stash@{0}`
4. Re-stage and re-commit (or `git commit --amend --no-edit` if the original commit was empty)

See `MEMORY.md` "Husky Pre-Commit Gotchas" for additional patterns surfaced in the 2026-04-25 close-out wave.
