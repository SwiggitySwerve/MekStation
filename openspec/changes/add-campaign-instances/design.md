# Design: Campaign Unit/Pilot Instances

## Context

MekStation needs to distinguish between:
1. **Vault Designs** - Templates/designs stored in the user's collection (unit customizations, pilot rosters)
2. **Campaign Instances** - Living entities within a campaign that accumulate history

This mirrors how MekHQ handles units: the "hangar" contains unit templates, while campaigns contain instances that track damage, repairs, and progression.

## Goals

- Separate design history (vault versioning) from gameplay history (campaign events)
- Allow the same vault design to be used in multiple campaigns simultaneously
- Track all instance state changes via the event store for auditability
- Support "statblock" pilots that exist only within a campaign (no vault reference)

## Non-Goals

- Modifying the vault unit/pilot when a campaign instance changes
- Automatic sync between vault design changes and existing campaign instances
- Cross-campaign instance sharing (each campaign has its own instances)

## Decisions

### Decision: Instance Creation on Force Assignment

When a unit is assigned to a campaign force, a `CampaignUnitInstance` is created that:
- References the vault unit ID
- Snapshots the vault unit version at assignment time
- Initializes with "operational" status and no damage

**Rationale**: This is the moment the unit enters the campaign context. The version snapshot ensures the campaign tracks what was deployed, even if the vault design is later modified.

**Alternative considered**: Create instance when campaign is created. Rejected because users may add/remove units from forces during a campaign.

### Decision: Statblock Pilots as Inline Data

Statblock pilots (quick NPCs without full pilot records) store their data inline in the instance:

```typescript
interface ICampaignPilotInstance {
  vaultPilotId?: string;  // null for statblock pilots
  statblockData?: {       // populated for statblock pilots
    name: string;
    gunnery: number;
    piloting: number;
  };
}
```

**Rationale**: Statblock pilots are ephemeral - they don't need vault persistence or cross-campaign tracking. Inline storage is simpler.

### Decision: Damage State Stored on Instance

Unit damage is stored directly on the instance (not derived from events) for performance:

```typescript
interface IUnitDamageState {
  armorByLocation: Record<MechLocation, { current: number; max: number }>;
  structureByLocation: Record<MechLocation, { current: number; max: number }>;
  destroyedComponents: string[];
  criticalHits: ICriticalHit[];
}
```

**Rationale**: Deriving damage from events on every render would be expensive. Events still track the changes for audit, but current state is denormalized.

### Decision: Events Still Track All Changes

Even though current state is stored on the instance, all state changes emit events:
- `unit_damage_applied`
- `unit_repaired`
- `unit_status_changed`
- `pilot_xp_gained`
- `pilot_wounded`

**Rationale**: The event store remains the authoritative history. Instance state is a materialized view that can be verified against events.

## Data Model

```
┌─────────────────────────────┐
│         Vault               │
├─────────────────────────────┤
│ Unit Designs (templates)    │──┐
│ Pilot Templates             │  │
│ - Version history only      │  │ References
└─────────────────────────────┘  │
                                 │
┌─────────────────────────────┐  │
│        Campaign             │  │
├─────────────────────────────┤  │
│ CampaignUnitInstance        │◄─┘
│ - vaultUnitId (reference)   │
│ - vaultUnitVersion (snapshot)│
│ - currentDamage (state)     │
│ - status                    │
│                             │
│ CampaignPilotInstance       │
│ - vaultPilotId (optional)   │
│ - statblockData (optional)  │
│ - currentXP, wounds, kills  │
│                             │
│ Event Store                 │
│ - All state changes logged  │
│ - Causality tracking        │
└─────────────────────────────┘
```

## Migration Plan

1. Add new tables (non-breaking)
2. Update force assignment to create instances
3. Update game resolution to update instances
4. Migrate existing campaign data (if any exists)

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Denormalized state could drift from events | Add verification command to compare state vs replayed events |
| Instance state size could grow large | Chunk completed mission data, only keep recent state in memory |
| Version snapshot could become stale | Display warning if vault design has newer version, offer "upgrade" option |

## Open Questions

- Should destroyed units be soft-deleted or marked with status?
- How to handle "refit" scenarios where a vault design is updated mid-campaign?
- Should statblock pilots be promotable to full vault pilots?
