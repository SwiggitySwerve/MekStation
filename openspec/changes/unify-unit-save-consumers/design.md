## Ownership and boundaries

`unitSaveState.ts` remains the only owner of statuses, receipt construction and
baseline comparison. PR2's adapters remain the only fingerprint translators.
`MultiUnitTabsUnitState.ts` maps existing registry/state facades to those adapters;
the dialog hook transports submitted snapshots and confirmed API identities.
Shared React components subscribe to those results and render existing wording.
`customizerDraftStorage.ts` owns storage-key lookup and completed-write evidence.

The dialog captures original draft and submitted draft/library fingerprints
before awaiting the API. Content comparison ignores temporary IDs and metadata
according to the existing owner. Receipt construction uses the returned identity,
never a guessed successful revision. Successful completion writes identity and
receipt together when content still matches; later edits receive the submitted
receipt without losing their content. A failed browser write remains distinct
from a confirmed library save and can retry locally without another API call.

## Caller paths

| Entry/reader/writer | Treatment |
| --- | --- |
| Tab manager and tab-close dirty fallback | Existing signatures and conservative persisted fallback retained. |
| Customizer router and MultiUnitTabs save readiness | Existing routing retained; `serializeCustomLibraryState` remains exported. |
| Mech, vehicle, aerospace, infantry, battle armor, ProtoMech stores | Existing registries and factories retained; consume shared editor adapters and additive receipts. |
| Library create/overwrite completion | Validate response; compare captured/current content through the owner; confirm source store and tab before writes/close. |
| UnitSaveStatus and UnitSaveSummary surfaces | Select correct family, subscribe to its store, and render owner classification. |
| Draft persistence and receipt bus | Existing keys/envelopes preserved; failed writes outrank prior browser success. |
| BrowserDraftStatus Retry | Rewrite current family draft only; no library API request. |
| UnsavedChangesDialog save-and-close | Existing root controller retained; child dialog closes only after confirmed save of unchanged content and successful browser write. |
| Engine, AI, runner, multiplayer authority and P2P | No direct customizer save-metadata writer/reader path; no changes. |

`useMultiUnitTabsController.ts` and `LoadRequestCoordinator.ts` are protected D-11
files and remain untouched. Legacy capital display routing remains separate from
editable save support. No new registry event/reset seam is introduced.

## Verification

Tests use real family stores and registries with the library HTTP boundary mocked.
Deferred requests cover no-op writes, timestamps, nested edits, replacements,
removed tabs, response validation, browser failure/Retry, and save-and-close.
Same-ID family collisions exercise the reader and subscriptions. Restoring
reference equality must fail the no-op/timestamp cases. Existing literal stored
fingerprints and compatibility tests remain unchanged.
