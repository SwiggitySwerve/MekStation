# Chassis index foundation

## Decision and implementation boundary

Implement the requirements in `specs/battlemech-chassis-index/spec.md`. Existing `openspec/specs/unit-services/spec.md` and `openspec/specs/compendium-browser/spec.md` remain the variant and navigation authorities. This package is ready for the implementation requested by the user.

Data flow: bundled `public/data/units/battlemechs/index.json` -> server loader -> pure validated builder -> `/api/chassis` -> Compendium chassis browser. Filesystem access stays server-side. No Zustand persistence is needed for read-only catalog data; selection is URL state and filters are component state.

`IChassisIndex` contains a schema version, source version/date, total variants, and `IChassisEntry[]`. Each chassis has a stable `battlemech:<slug>` ID based on its exact catalog name, display name, explicit aliases, sorted variant records, and aggregate weights, weight classes, technology bases, and years. Every variant preserves its canonical unit ID and rules level. Future source/model records reference the chassis ID separately; research slugs are not automatically promoted into these identities.

Chassis IDs do not depend on variant order, weight, variant count, or aliases. A future catalog rename requires an explicit identity migration or override; never silently regenerate externally referenced IDs. Distinct catalog names that produce the same slug fail validation rather than merge. Alias labels cannot shadow a different chassis. Initial curated mappings cover Mad Cat/Timber Wolf, Vulture/Mad Dog, Ryoken/Stormcrow, Daishi/Dire Wolf, Thor/Summoner, Loki/Hellbringer, Black Hawk/Nova, Nobori-nin/Huntsman, and Hankyu/Arctic Cheetah. These names improve discovery and do not imply identical geometry across variants.

## Validation and errors

Validate the source shape, declared count, unique unit IDs, positive weights, recognized technology values, and nonempty identity fields. Reject malformed data and ambiguous identities. The API returns 405 for unsupported methods, 400 for repeated/invalid query parameters, 404 for unknown chassis IDs, and 500 for unreadable or invalid source data. No source path is derived from user input. Do not turn source failures into an empty successful index.

## User interface

Reuse CompendiumLayout, existing form controls, cards, and buttons. Provide name/alias/variant search and weight-class filtering, bounded pagination, explicit loading/error/retry/empty states, keyboard-operable chassis selection, URL restoration, responsive variant cards, and links to existing canonical unit detail routes. Clearly state that model previews are not yet attached and that the catalog includes unofficial designs. No preview rights claim is implied by catalog inclusion.

## Verification

Focused builder tests cover real catalog completeness, deterministic identity, alias lookup, successor separation, mixed technology, multiweight chassis, and rejection of duplicates/collisions. API tests cover method/query/error boundaries and variant lookup. Browser proof exercises discovery from Compendium, alias search, filtering, shareable selection after reload, unit links, empty results, and narrow viewports. Run scoped formatting, repository lint/typecheck, and strict package validation; report unrelated dirty-tree failures separately.
