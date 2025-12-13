# MekStation

MekStation is a spec-driven BattleTech unit construction app (Next.js + React + TypeScript) that implements TechManual construction rules with OpenSpec as the single source of truth.

## Quick Start

```bash
npm install
npm run dev        # Start web app at http://localhost:3000
npm test           # Run tests
npm run lint       # Lint codebase
```

Desktop build (Electron):

```bash
npm run electron:dist:all   # Build platform installers from root
```

Desktop auto-updates (clean GitHub Releases):

- GitHub Releases are kept **installer/package only** (no `latest*.yml` / `*.blockmap` clutter).
- Auto-update metadata (`latest*.yml`) is hosted on **GitHub Pages** under `updates/`.

Release workflow (per platform):

```bash
# 1) Build platform artifacts (generates installers/packages + update metadata in desktop/release/)
npm run electron:dist:win   # or :mac / :linux

# 2) Upload installers/packages to the GitHub Release (filters out *.yml and *.blockmap)
npm --prefix desktop run release:upload-assets -- --tag vX.Y.Z

# 3) Publish update metadata to GitHub Pages (gh-pages branch)
npm --prefix desktop run release:publish-update-metadata -- --tag vX.Y.Z
```

If you are using a fork or custom hosting, set:
- `MEKSTATION_UPDATE_FEED_BASE_URL` (defaults to `https://swiggityswerve.github.io/MekStation/updates`)

## Key Docs

- Overview & deep-dive: `docs/overview.md`
- Getting started: `docs/development/getting-started.md`
- Project structure: `docs/architecture/project-structure.md`
- Coding standards: `docs/development/coding-standards.md`
- OpenSpec guide: `openspec/AGENTS.md`
- BattleTech rules specs: `openspec/specs/`
- Contributing: `docs/CONTRIBUTING.md`

## License

- Code: Apache 2.0 (`LICENSE.code`)
- Data/assets: CC-BY-NC-SA-4.0 (`LICENSE.assets`)

See `LICENSE` for details. Inspired by the MegaMek project. BattleTech trademarks belong to their respective owners. This is an unofficial fan-created tool.
