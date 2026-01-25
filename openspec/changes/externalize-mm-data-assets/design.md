# Design: Externalize mm-data Assets

## Context

MekStation uses record sheet SVG templates and armor pip graphics from MegaMek's mm-data repository. Currently, these are copied into `public/record-sheets/` via a sync script. This creates licensing complexity and repository bloat.

**Stakeholders**: MekStation developers, MegaMek team (upstream asset maintainers)

**Constraints**:
- Assets must work offline in Electron desktop app
- Web app should have fast initial load (lazy load assets)
- Development workflow must remain simple
- Must maintain proper CC-BY-NC-SA-4.0 attribution

## Goals / Non-Goals

**Goals**:
- Remove mm-data assets from MekStation git history
- Maintain clear licensing separation between code (Apache 2.0) and assets (CC-BY-NC-SA-4.0)
- Support versioned asset updates tied to mm-data releases
- Preserve current runtime asset loading API (MmDataAssetService)

**Non-Goals**:
- Changing how assets are rendered in the UI
- Modifying mm-data repository structure
- Creating our own asset hosting infrastructure

## Decisions

### Decision 1: jsDelivr CDN Distribution

**What**: Fetch assets directly from upstream mm-data via jsDelivr CDN, which automatically mirrors GitHub repositories.

**Why**:
- No changes required to mm-data repository
- jsDelivr provides fast CDN access globally
- Supports version pinning via git tags: `@v0.50.07` or `@main`
- Assets stay with their source repository and license
- Free, reliable infrastructure

**URL Pattern**: `https://cdn.jsdelivr.net/gh/MegaMek/mm-data@{version}/data/images/recordsheets/...`

**Alternatives considered**:
1. **GitHub Releases**: Would require mm-data to publish release artifacts
2. **NPM package**: Adds publishing overhead, npm ecosystem dependency
3. **Git submodule**: Complicates clone workflow, includes entire mm-data repo
4. **Self-hosted CDN**: Infrastructure cost and maintenance

### Decision 2: Build-Time Bundling for Desktop, Runtime Fetch for Web

**What**: 
- Desktop (Electron): Download and bundle assets during `npm run electron:dist:*`
- Web: Fetch assets at runtime with aggressive caching

**Why**:
- Desktop must work offline after installation
- Web can leverage browser caching and lazy loading
- Keeps initial download size manageable

### Decision 3: Asset Manifest with Integrity Hashes

**What**: Generate `mm-data-assets-manifest.json` containing:
```json
{
  "version": "0.50.07",
  "commit": "abc123",
  "assets": {
    "templates_us/mek_biped_default.svg": {
      "size": 550309,
      "sha256": "..."
    }
  }
}
```

**Why**:
- Enables incremental updates (only fetch changed assets)
- Integrity verification for security
- Version tracking for debugging

### Decision 4: Fallback Chain for Asset Loading

**What**: MmDataAssetService tries sources in order:
1. Local bundled assets (desktop) or browser cache (web)
2. jsDelivr CDN (`cdn.jsdelivr.net/gh/MegaMek/mm-data@{version}/...`)
3. Direct GitHub raw (`raw.githubusercontent.com/MegaMek/mm-data/...`)

**Why**: Resilience against CDN outages, development flexibility

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MmDataAssetService                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Cache Layer │→ │ Fetch Layer │→ │ Fallback Sources    │  │
│  │ (Memory +   │  │ (with retry)│  │ 1. Local/Bundled    │  │
│  │  Browser)   │  │             │  │ 2. jsDelivr CDN     │  │
│  └─────────────┘  └─────────────┘  │ 3. GitHub Raw       │  │
│                                     └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

Build Pipeline:
┌────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ npm build  │ ──→ │ fetch-mm-assets  │ ──→ │ Bundle/Deploy   │
│            │     │ (downloads from  │     │ (assets in      │
│            │     │  GitHub Release) │     │  dist/assets/)  │
└────────────┘     └──────────────────┘     └─────────────────┘
```

## Risks / Trade-offs

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CDN/GitHub outage | Low | High | Fallback chain, local dev cache |
| Version mismatch | Medium | Medium | Manifest version checking |
| Slow first load (web) | Medium | Low | Preload critical assets, loading states |
| Build complexity | Low | Medium | Well-documented scripts, CI validation |

## Migration Plan

### Phase 1: Prepare Infrastructure
1. Create asset packaging script for mm-data releases
2. Implement manifest generation
3. Update MmDataAssetService with fallback chain

### Phase 2: Update Build Pipeline
1. Add `fetch-mm-assets.ts` script
2. Update `package.json` scripts
3. Update CI/CD workflows to fetch assets

### Phase 3: Remove Embedded Assets
1. Delete `public/record-sheets/biped_pips/`
2. Delete `public/record-sheets/templates*/`
3. Update `.gitignore` to exclude fetched assets
4. Remove `sync-mm-data-assets.sh`

### Rollback
- Re-run sync script to restore embedded assets
- Revert MmDataAssetService to static paths

## Resolved Decisions

1. **Use upstream mm-data directly** - No fork or MekStation-specific releases
2. **Pin to latest stable mm-data release** - Update periodically as needed
3. **No changes to mm-data repo** - Use jsDelivr CDN which mirrors GitHub automatically
