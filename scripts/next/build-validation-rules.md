# Build and validation

`npm run build` creates the standalone artifact with Turbopack, manifest sync,
the Next wrapper's 12 GB default heap limit, and multiplayer hydration. It skips
Next's duplicate TypeScript pass unconditionally. A successful artifact build
does not establish source validity.

PR CI unconditionally runs checkout, setup, `next typegen` and
`npm run typecheck`, including for E2E, OpenSpec and root TypeScript changes.
Generated route types participate in the full root program. The separate lint
and desktop typecheck jobs remain mandatory dependencies of the unconditional `Lint and Test`
aggregator. That aggregator refuses any non-success dependency result. Main's
required context must include `Lint and Test`.

Release CI checks out the selected release ref in `validate-source`, installs
both packages, generates route types, and runs root typecheck, lint and desktop
typecheck. Both the web artifact job and Docker build require this job. Installer
and publication jobs depend on those validated builds. Do not add packaging or
publication paths that bypass validation of the same release source.

For local checked validation, run `npx next typegen` followed by `npm run verify`;
run `npm run electron:typecheck` for desktop types. The root typecheck includes
the existing test and script coverage; there is no narrower build tsconfig.

The webpack callback remains for `build:analyze`, `build:profile`, `build:debug`,
`dev:e2e` and the CAMP-00 packaged-socket validator. Its side-effects policy,
equipment rule, progress plugin and ESM externals setting do not accelerate the
default Turbopack build. Preserve their behavior unless a separate webpack
experiment and runtime proof justify a change.
