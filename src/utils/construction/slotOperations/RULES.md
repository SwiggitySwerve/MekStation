# Mech critical-slot allocation

This module owns critical-slot occupancy and allocation. Loaders, editor stores,
placement previews and validation consume its public functions. Equipment mass,
BV, cockpit identity and source-format conversion remain with their existing owners.

- `parts.ts` enumerates every occupied part of one mount; a split weapon is one
  equipment instance with two locations, never two separately charged weapons.
- `splitAllocation.ts` owns weapon split eligibility and location adjacency.
  MegaMek `48fcb2f64`, `WeaponType.java:2619-2621` requires at least eight critical
  slots. `MtfFile.java:1086-1124` and `Mek.java:489-518` reconstruct adjacent parts.
- Editor allocation follows MegaMekLab `62bf193`,
  `BMCriticalTransferHandler.java:149-236`: contiguous portions in adjacent
  locations, no leg splitting and no splitting across locations on a LAM.
  Loading an upstream-invalid design remains separate from proposing a new mount.
- An allocation update replaces the whole mount allocation. Unassigning clears
  every part; failed placement leaves the original allocation intact. Fixed
  OmniMech mounts reserve all their occupied parts.
- Compact/sort operate on each location's portion and recombine results into one
  mount update. Failure to place any part prevents an incomplete mount update.
- Saved split mounts retain every critical-grid cell. Their equipment entries
  omit explicit primary-only slot arrays so the existing loader reconstructs both
  portions from the complete grid. No persisted schema extension is needed.

Cockpit-specific topology is supplied by `CockpitType.ts` through `topology.ts`.
Grid rendering, placement warnings, fill, compact and sort pass the selected
cockpit, including their scheduled automatic variants. Callers that omit the
optional cockpit retain the legacy Standard layout.

`sourceGrid.ts` owns the source/current critical-grid projection shared by editor
construction and saving. Unchanged native tokens and explicit empty arrays survive
at every active location. Matching consumes design/allocation facts, never temporary
mount IDs. Moves and removals clear all split/spread portions before new portions
are written. Current fixed systems and changed component allocations replace stale
source cells through the existing topology, source-token and component owners.
Inactive configuration locations are discarded. Source-backed saves use this complete
projection; context-free saves retain their legacy byte representation and absence.
An invalid live mount still retains all its cells when a new fixed component
claims them. The selected topology reports that conflict through validation;
serialization must not erase a primary or secondary portion to conceal it.
Reopening retains the supplied arrays; equipment ID/category reconciliation and MTF
export remain separate owners. Complete native grids can expose those residuals.
