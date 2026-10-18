/** Owned exceptions to recapture, expired by their owner's ledger delivery. */
export interface IScenarioPackQuarantine {
  readonly packId: 'coop-host-review' | 'coop-guest-proposal';
  readonly reason: 'no sanctioned co-op generator/checkpoint contract';
  readonly ownerUnit: string;
  readonly diagnosisDoc: string;
}

export interface IQuarantineOwnerUnit {
  readonly id: string;
  readonly state: string;
}

const diagnosisDoc =
  'docs/audits/2026-10-18-scenario-pack-recapture-diagnosis.md';

export const SCENARIO_PACK_QUARANTINES: readonly IScenarioPackQuarantine[] = [
  {
    packId: 'coop-host-review',
    reason: 'no sanctioned co-op generator/checkpoint contract',
    ownerUnit: 'P2J',
    diagnosisDoc,
  },
  {
    packId: 'coop-guest-proposal',
    reason: 'no sanctioned co-op generator/checkpoint contract',
    ownerUnit: 'P2J',
    diagnosisDoc,
  },
];

/** Called by both the nightly entry point and the live-ledger guard test. */
export function validateScenarioPackQuarantines(
  quarantines: readonly IScenarioPackQuarantine[],
  units: readonly IQuarantineOwnerUnit[],
  registeredPackIds: readonly string[],
): void {
  const seen = new Set<string>();
  for (const quarantine of quarantines) {
    if (seen.has(quarantine.packId)) {
      throw new Error(`Duplicate quarantine for ${quarantine.packId}`);
    }
    seen.add(quarantine.packId);
    if (!registeredPackIds.includes(quarantine.packId)) {
      throw new Error(
        `Quarantine names unregistered pack ${quarantine.packId}`,
      );
    }
    const owner = units.find((unit) => unit.id === quarantine.ownerUnit);
    if (!owner) {
      throw new Error(
        `Quarantine ${quarantine.packId}: ownerUnit ${quarantine.ownerUnit} does not exist`,
      );
    }
    if (['main-verified', 'complete', 'archived'].includes(owner.state)) {
      throw new Error(
        `Quarantine ${quarantine.packId} expired: ownerUnit ${owner.id} is ${owner.state}; lift the quarantine and register its sanctioned generator/checkpoint contract`,
      );
    }
    if (!quarantine.reason.trim() || !quarantine.diagnosisDoc.trim()) {
      throw new Error(
        `Quarantine ${quarantine.packId} requires a reason and diagnosis document`,
      );
    }
  }
}
