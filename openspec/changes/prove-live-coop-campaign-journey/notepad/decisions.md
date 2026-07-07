# Decisions — prove-live-coop-campaign-journey

Architectural choices made mid-execution. Graduate to design.md before archive (any decision referenced by 2+ tasks).

## Open items to resolve during execution

- **Vestigial client-side host (Momus gap — resolve during tasks 3.1/4.1).** `openCoopRuntimeSession` (`src/lib/campaign/coop/coopRuntimeSession.ts` ~line 99) still constructs a client-side `CampaignMatchHost` for the host role. With the server-resident host now authoritative, the host browser must NOT keep a vestigial local authoritative host. `getActiveCoopHost` / `reconcileCoopOutcomeForCampaign` must read/write against the server-resident host over the transport. Record the resolution here when tasks 3.1/4.1 land.
- **Host-review round-trip (R2).** Pre-authorized honest fallback: if the approve/veto commit round-trip can't fully close, land `auto-approve` end-to-end, assert host-review to the max provable point (proposal reaches host review surface across browsers), file the residual (F5). Record which path landed.
