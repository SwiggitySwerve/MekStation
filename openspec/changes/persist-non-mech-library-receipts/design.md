## Boundaries

The pure save-state owner from PR1 remains authoritative for receipt construction,
baseline comparison and status transitions. `unitDraftPersistence.ts` owns the
existing non-mech persistence projections. `unitSaveStateAdapters.ts` translates
editor state into those projections and existing library serializers; it does
not compute construction rules or alter unit actions.

Factory changes are limited to importing the moved projection and wrapping its
persist options. The wrapper appends `librarySave` only when present. Mech options
already include that field and keep their existing field order and fingerprint
facade. All contexts, registry functions and reset/clear seams stay intact.

Draft fingerprints exclude runtime identity, timestamps, receipt/modified metadata
and cached BV results, and normalize temporary mount IDs and ammo links. Library
fingerprints use existing serializers. Undefined optional fields remain absent
under PR1's canonical JSON rule. Creating a receipt describes submitted content;
recording it compares against the current draft even if later edits arrived.

## Caller paths

| Path | Treatment |
| --- | --- |
| Six editor factories and registry hydration | Existing field projections; optional additive receipt persistence. |
| Identity, equipment and BV actions | Existing implementations retained. |
| Mech history and fingerprint facade | Delegated unchanged; old literal fingerprint fixture still required. |
| Custom library loader | Existing source/revision guard; attach metadata to admitted editable state. |
| Canonical loader and capital view | No receipt invented. |
| Tab manager, customizer router and draft badge | Existing callers preserved; UI adoption follows in PR3. |
| Library-save dialog and unsaved dialog | Existing controllers preserved until PR3. |
| Gameplay engine, AI, runner, multiplayer and P2P | No direct editor-metadata writer path. |

## Compatibility and proof

Literal localStorage envelopes were captured from main 574f6f06f before changing
the factories. Each family hydrates through its existing registry and rewrites
the same decoded payload when no receipt exists. Metadata receipt round trips,
late-edit comparisons, temporary ID normalization, validated custom loads and
canonical exclusions have regression tests. A persistence wrapper that drops a
receipt must fail the reload tests. No committed fixture is regenerated.
