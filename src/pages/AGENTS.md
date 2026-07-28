# Pages Router

## OVERVIEW

- This is the Next.js Pages Router surface; there is no `src/app/` tree.
- Route files: 148 TS/TSX files, including 77 API handlers and 40 gameplay routes.
- Filenames and folders are the URL contract: dynamic segments use `[id]`, `[matchId]`, etc.
- `_app.tsx` owns global CSS, browser-safe service startup, shell layout, error boundary, and PWA hooks.

## STRUCTURE

- `_app.tsx`: `GlobalStyleProvider` → `ToastProvider` → `Layout`/`ErrorBoundary` composition.
- `api/`: Next `NextApiRequest`/`NextApiResponse` handlers for catalog, units, gameplay, vault, and multiplayer.
- `gameplay/`: campaign, encounter, game-session, lobby, force, pilot, and repair routes.
- `compendium/`, `customizer/`, `units/`, `share/`, `multiplayer/`: feature route families.

## WHERE TO LOOK

- `pages-modules/`: route-adjacent helpers, view models, shells, and API response utilities.
- `../components/`: renderable UI; keep route orchestration separate from reusable components.
- API helpers: `../pages-modules/api/routeHelpers.ts`; global client initialization: `_app.tsx`.

## CONVENTIONS

- Use `next/router`, `next/link`, and `next/head` patterns already present; do not introduce App Router APIs.
- Keep route handlers thin: validate method/query, initialize the correct server service, call domain logic, shape response.
- Reuse `@/pages-modules/api/routeHelpers` for method checks, query validation, errors, and API database setup.
- Keep Node-only dependencies (SQLite, filesystem, server resolvers) in API/server paths, never client page bundles.
- Put substantial page composition or route-specific helpers in `src/pages-modules/<domain>`.
- Preserve dynamic route folder names and existing response/error shapes when changing an endpoint.
- Add route-level tests or focused integration coverage for new handlers and navigation branches.

## ANTI-PATTERNS

- Do not create `src/app/` routes or use `next/navigation` in this Pages Router codebase.
- Do not duplicate API method/error handling in every endpoint when a shared helper exists.
- Do not import SQLite/server-only services into browser-rendered pages or shared client components.
- Do not hide URL parsing, route guards, or page lifecycle behavior inside generic UI primitives.
- Do not rename or flatten dynamic route folders without auditing links, API consumers, and E2E coverage.
- Do not place large route-specific view models directly in page files when a pages-module seam exists.

## COMMANDS

- Focused tests: `npm test -- src/pages/<path>`.
- Route/browser proof: `npm run test:e2e`; shared static gates: `npm run typecheck` and `npm run lint`.
