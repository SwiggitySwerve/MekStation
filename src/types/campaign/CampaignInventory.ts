/**
 * Campaign Inventory — frozen post-battle inventory schema
 *
 * `ICampaignInventory` is the single campaign-attached structure the
 * post-battle bay UI (CP2a — `add-campaign-bay-ui`) renders. It
 * aggregates the three post-battle "bays" — repair, salvage, and
 * medical — plus a roll-up summary.
 *
 * ─────────────────────────────────────────────────────────────────────
 * SCHEMA FROZEN — `add-campaign-combat-loop` design.md D4.
 *
 * Every type in this module is FROZEN. CP2a (`add-campaign-bay-ui`)
 * RENDERS this structure and MUST NOT alter the schema. A genuine
 * schema gap is its own OpenSpec change, never a silent edit here.
 *
 * `IRepairBayItem` is a projection of `IRepairTicket`.
 * `ISalvageBayItem` is a projection of `ISalvageCandidate`.
 * `IMedicalBayItem` is a projection of the campaign-roster pilot
 * injury state (`ICampaignRosterEntry`).
 * ─────────────────────────────────────────────────────────────────────
 *
 * @spec openspec/changes/add-campaign-combat-loop/specs/campaign-combat-loop/spec.md
 * @module types/campaign/CampaignInventory
 */

/**
 * One repair-bay line item.
 *
 * SCHEMA FROZEN (design.md D4) — see module header. CP2a renders this;
 * any schema-change request is a new OpenSpec change.
 *
 * Projection of `IRepairTicket`:
 *   - `ticketId`     ← `IRepairTicket.ticketId`
 *   - `unitId`       ← `IRepairTicket.unitId`
 *   - `kind`         ← `IRepairTicket.kind`
 *   - `location`     ← `IRepairTicket.location` (null when absent)
 *   - `expectedHours`← `IRepairTicket.expectedHours`
 *   - `partsReady`   ← every `IRepairTicket.partsRequired[i].matched`
 *   - `status`       ← `IRepairTicket.status` (mapped, see projection)
 */
export interface IRepairBayItem {
  /** Originating repair ticket id (from `IRepairTicket`). */
  readonly ticketId: string;
  /** Unit the repair work targets. */
  readonly unitId: string;
  /** Kind of repair work. */
  readonly kind: 'armor' | 'structure' | 'component' | 'ammo' | 'heat-recovery';
  /** Mech location, or null for location-less tickets (e.g. ammo bins). */
  readonly location: string | null;
  /** Estimated tech-hours to complete the work. */
  readonly expectedHours: number;
  /** True when every required part has been matched from inventory/salvage. */
  readonly partsReady: boolean;
  /** Lifecycle status of the repair. */
  readonly status: 'queued' | 'parts-needed' | 'in-progress' | 'done';
}

/**
 * One salvage-bay line item.
 *
 * SCHEMA FROZEN (design.md D4) — see module header.
 *
 * Projection of `ISalvageCandidate`:
 *   - `partId`        ← `ISalvageCandidate.partId` ?? `ISalvageCandidate.unitId`
 *   - `sourceUnitId`  ← `ISalvageCandidate.unitId`
 *   - `designation`   ← `ISalvageCandidate.designation`
 *   - `recoveredValue`← `ISalvageCandidate.recoveredValue`
 *   - `disposition`   ← `ISalvageCandidate.disposition` (mapped)
 *   - `status`        ← `ISalvageCandidate.status` (mapped)
 */
export interface ISalvageBayItem {
  /** Stable salvage part id (from `ISalvageCandidate`). */
  readonly partId: string;
  /** Unit the salvage was recovered from. */
  readonly sourceUnitId: string;
  /** Display designation of the recovered item. */
  readonly designation: string;
  /** Recovered value in C-bills. */
  readonly recoveredValue: number;
  /** Which side this candidate was awarded to. */
  readonly disposition: 'mercenary' | 'employer';
  /** Lifecycle status of the salvage candidate. */
  readonly status: 'pending' | 'accepted' | 'declined';
}

/**
 * One medical-bay line item.
 *
 * SCHEMA FROZEN (design.md D4) — see module header.
 *
 * Projection of the campaign-roster pilot injury state
 * (`ICampaignRosterEntry`):
 *   - `pilotId`     ← `ICampaignRosterEntry.pilotId`
 *   - `pilotName`   ← `ICampaignRosterEntry.pilotName`
 *   - `injuryLevel` ← `ICampaignRosterEntry.status` (mapped)
 *   - `daysToRecover`← `ICampaignRosterEntry.recoveryTime`
 *   - `status`      ← derived from `recoveryTime` + `status`
 */
export interface IMedicalBayItem {
  /** Pilot under medical care (from `ICampaignRosterEntry`). */
  readonly pilotId: string;
  /** Pilot display name. */
  readonly pilotName: string;
  /** Severity of the pilot's injury. */
  readonly injuryLevel: 'none' | 'light' | 'serious' | 'critical' | 'kia';
  /** Estimated days until the pilot returns to active duty. */
  readonly daysToRecover: number;
  /** Lifecycle status of the medical entry. */
  readonly status: 'recovering' | 'ready' | 'discharged';
}

/**
 * Roll-up summary across the three bays.
 *
 * SCHEMA FROZEN (design.md D4) — see module header.
 */
export interface IInventorySummary {
  /** Count of repair tickets in the repair bay. */
  readonly repairTicketCount: number;
  /** Sum of `expectedHours` across every repair-bay item. */
  readonly totalRepairHours: number;
  /** Sum of mercenary-share recovered value in C-bills. */
  readonly salvageValueTotal: number;
  /** Count of pilots currently in the medical bay. */
  readonly pilotsInMedical: number;
}

/**
 * Frozen post-battle inventory aggregate, attached to a campaign.
 *
 * SCHEMA FROZEN (design.md D4) — see module header. This is the
 * contract `add-campaign-bay-ui` (CP2a) depends on. CP2a renders
 * this structure and MUST NOT alter the schema.
 *
 * The inventory is a *derived projection*: `projectCampaignInventory`
 * recomputes it each day from the campaign's repair tickets, salvage
 * allocations, and roster pilot injury state. It is never an
 * independently-mutated store.
 */
export interface ICampaignInventory {
  /** Campaign this inventory belongs to. */
  readonly campaignId: string;
  /** Timestamp the inventory was projected (ISO 8601). */
  readonly generatedAt: string;
  /** Repair-bay line items. */
  readonly repairBay: readonly IRepairBayItem[];
  /** Salvage-bay line items. */
  readonly salvageBay: readonly ISalvageBayItem[];
  /** Medical-bay line items. */
  readonly medicalBay: readonly IMedicalBayItem[];
  /** Roll-up summary across the three bays. */
  readonly summary: IInventorySummary;
}
