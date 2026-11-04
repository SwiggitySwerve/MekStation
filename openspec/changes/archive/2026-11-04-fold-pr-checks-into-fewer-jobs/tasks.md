## Implementation

- [x] Fold the short checks into `static-checks` and `simulation-checks`, drop `install-deps`, and gate the code-only jobs at job level.
- [x] Make `Lint and Test` accept only gated-off skips, and test its jq filter against fixtures.
- [x] Update the CI contracts and their tests for the new job ids.
- [x] Verify actionlint, the contract validators and tests, strict OpenSpec validation, green PR Checks runs, and a run whose failing job fails `Lint and Test`.
