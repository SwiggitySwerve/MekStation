# Page Modules

## OVERVIEW

- Route-adjacent composition layer: 41 files kept outside Next route entrypoints.
- Modules are widely imported by pages/components and encode reusable page
  orchestration, not framework routes.
- Keep this layer thin enough to preserve the `src/pages` URL contract while avoiding page-file monoliths.

## STRUCTURE

- `api/routeHelpers.ts`: shared `NextApiRequest`/`NextApiResponse` method, query, error, and DB helpers.
- `gameplay/campaigns/`: campaign shell, mission launch, coop entry, contract display, readiness surfaces.
- `gameplay/encounters/`, `gameplay/games/`, `gameplay/lobby/`: route-specific loaders and session helpers.
- `units/`: list/detail types, constants, icons, and views used by unit routes.
- `shared/`, `share/`, `contacts/`, `multiplayer/`: cross-route page helpers and feature-specific view models.
- `e2e/`: deterministic mock data for simulation viewer, sync, and analysis pages.

## WHERE TO LOOK

- API handler consumers: `../pages/api/`; route entry consumers: `../pages/`.
- Route rendering components: `../components/`; persistence/bootstrap seams: `api/routeHelpers.ts`.

## CONVENTIONS

- Name modules for the route surface they serve (`campaignPageShell`, `missionLaunchPage.*`, `*Page.helpers`).
- Keep route handlers and page files responsible for framework lifecycle; move reusable orchestration here.
- Keep API helpers server-safe; database initialization belongs behind API/server boundaries.
- Preserve domain subfolders and import through `@/pages-modules/<domain>/...`.
- Co-locate focused tests under the owning gameplay module directory, especially for launch/readiness logic.
- Keep E2E fixtures deterministic and explicit; do not depend on live browser state or network data.
- Promote a helper to `shared/` only when multiple route domains genuinely use the same contract.

## ANTI-PATTERNS

- Do not turn this directory into a second routing tree or add files that Next should discover as pages.
- Do not move reusable visual primitives here; place them under `src/components/ui` or the owning domain component.
- Do not import client-only hooks, browser globals, or Zustand UI state into server API helpers.
- Do not duplicate `api/routeHelpers` response/method logic inside individual API routes.
- Do not couple unrelated route domains through a catch-all helper; keep gameplay, API, share, and E2E seams explicit.
- Do not make page modules depend on generated artifacts, live services, or nondeterministic fixtures.

## COMMANDS

- Focused tests: `npm test -- src/pages-modules/<path>`.
- Shared gates: `npm run typecheck` and `npm run lint`.
