# Storybook input gate

`ci-changes.mjs` owns the Storybook input decision. The PR workflow starts,
waits for, and caches Storybook only when its output is `true`. Main pushes,
the nightly schedule, and manual runs always enable it.

The input set includes all configured story extensions (JS, JSX, MJS, TS,
TSX, and MDX), configuration and mock modules anywhere in `.storybook`, and
their transitive imports and re-exports. MDX imports and JSX directory entry
points participate in the same import resolver. Missing imports retain their
candidate paths so deletions cannot silently remove the gate.

All `public` files are inputs because `staticDirs` copies the whole directory,
including `public/data`. Styles, non-code source assets, repository configuration,
dependencies, compiler configuration, and CI inputs also enable the gate.

Known repository paths outside these inputs can skip the PR build. Paths with
an unknown role enable Storybook. A failed diff or failed input discovery enables
every gate. Add new build input categories here and to the native Node contracts
before relying on a skip. The current closure still includes runtime BV modules;
BV edits must continue building Storybook.

`storybook-gate.test.mjs` exercises each story language, transitive dependencies,
runtime assets, unknown inputs, and every current closure member. It also executes
the production Storybook wait command and the workflow's actual Node aggregator
entry point and environment: a Storybook failure must fail Static Checks and
`Lint and Test`. Both commands run on Windows and Linux, so the failure contract
has no Bash/jq platform skip. `ci-changes.test.mjs` covers full main/nightly
execution and unreadable diffs.
