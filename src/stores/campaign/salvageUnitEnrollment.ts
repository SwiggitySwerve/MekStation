/**
 * Whole-unit salvage enrollment rules and coordinator.
 * A mercenary award with recorded recovery facts may enroll once into its
 * bound campaign. Identity conflicts, incomplete provenance and guest writes
 * refuse before mutation. The campaign owner commits roster, force and damage
 * through one save boundary; a repeated acceptance never resets later damage.
 */
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ISalvageCandidate } from '@/types/campaign/Salvage';

import { isSalvageUnitEnrolled } from '@/lib/campaign/salvage/salvageAcceptance';
import { validateSalvageUnitRecovery } from '@/lib/campaign/salvage/salvageUnitRecovery';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { deriveRosterReadiness } from '@/types/campaign/RosterUnitProjection';
import { parseUnitReference } from '@/types/unit/UnitIndex';

import { useCampaignRosterStore } from './useCampaignRosterStore';
import { useCampaignStore as getCampaignStore } from './useCampaignStore';

export interface ISalvageEnrollmentResult {
  readonly applied: boolean;
  readonly reason?: string;
}

export async function enrollSalvageUnit(
  campaign: ICampaign,
  candidate: ISalvageCandidate,
  updates: Partial<ICampaign>,
): Promise<ISalvageEnrollmentResult> {
  const refuse = (reason: string): ISalvageEnrollmentResult => ({
    applied: false,
    reason,
  });
  const roster = useCampaignRosterStore.getState();
  if (roster.campaignId !== campaign.id)
    return refuse('The roster belongs to another campaign.');
  if (campaign.coopSession?.mode === 'guest')
    return refuse('Only the campaign host may accept salvage.');
  const entitled = Object.values(campaign.salvageAllocations ?? {}).some(
    (allocation) =>
      allocation.pool.battleId === candidate.destroyedFromBattle &&
      allocation.mercenaryAward.side === 'mercenary' &&
      allocation.mercenaryAward.candidates.includes(candidate),
  );
  if (
    !entitled ||
    !['mercenary', 'auction-mercenary'].includes(candidate.disposition)
  )
    return refuse('This salvage is not awarded to the mercenary company.');
  const root = campaign.forces.get(campaign.rootForceId);
  if (!root) return refuse('The campaign root force is missing.');
  const recovery = candidate.recovery;
  if (!recovery)
    return refuse(
      'Salvage has no recorded design reference or recovered damage.',
    );
  if (!candidate.designation?.trim())
    return refuse('Salvage has no recorded designation.');
  const existing = roster.units.find(
    (unit) => unit.unitId === candidate.unitId,
  );
  const preliminary = validateSalvageUnitRecovery(
    candidate,
    existing?.unitSource === 'canonical' &&
      existing.unitRef === recovery.unitRef
      ? existing.unitRef
      : undefined,
  );
  if (
    preliminary.kind === 'refused' &&
    (recovery.unitSource !== undefined || existing)
  )
    return refuse(preliminary.reason);
  if (existing) {
    const sameSource =
      existing.unitSource === recovery.unitSource ||
      (recovery.unitSource === undefined &&
        existing.unitSource === 'canonical');
    if (
      existing.unitRef === recovery.unitRef &&
      sameSource &&
      existing.sourceVersion === recovery.sourceVersion &&
      root.unitIds.includes(candidate.unitId) &&
      campaign.unitCombatStates[candidate.unitId] &&
      candidate.status === 'awarded'
    )
      return { applied: true };
    return refuse(
      'This unit identity is already enrolled with conflicting provenance or force membership.',
    );
  }
  if (isSalvageUnitEnrolled(campaign, candidate))
    return refuse(
      'This unit already belongs to a force without matching roster enrollment.',
    );
  try {
    const historical =
      recovery.unitSource === 'custom' && recovery.sourceVersion !== undefined
        ? await customUnitApiService.getVersion(
            recovery.unitRef,
            recovery.sourceVersion,
          )
        : null;
    const reference = parseUnitReference(recovery.unitRef);
    const canonical =
      recovery.unitSource === 'custom'
        ? undefined
        : (
            await getCanonicalUnitService().getIndex({
              family: reference.family,
              strict: true,
            })
          ).find((entry) => entry.id === reference.id);
    const design =
      recovery.unitSource === 'custom' ? historical?.data : canonical;
    if (
      !design ||
      (recovery.unitSource === 'custom' && design.id !== recovery.unitRef) ||
      !design.variant?.trim() ||
      (historical && historical.version !== recovery.sourceVersion)
    )
      return refuse(
        'The recorded salvage design or historical version could not be resolved.',
      );
    const validated = validateSalvageUnitRecovery(
      candidate,
      canonical ? recovery.unitRef : undefined,
    );
    if (validated.kind === 'refused') return refuse(validated.reason);
    const forces = new Map(campaign.forces);
    forces.set(root.id, {
      ...root,
      unitIds: [...root.unitIds, candidate.unitId],
      updatedAt: new Date().toISOString(),
    });
    const result = await getCampaignStore()
      .getState()
      .commitRosterEnrollment(
        campaign,
        {
          unitId: candidate.unitId,
          unitRef: validated.recovery.unitRef,
          unitSource: validated.recovery.unitSource,
          ...(validated.recovery.sourceVersion !== undefined
            ? { sourceVersion: validated.recovery.sourceVersion }
            : {}),
          unitName: candidate.designation,
          chassisVariant: design.variant,
          readiness: !validated.recovery.combatState.combatReady
            ? 'Destroyed'
            : candidate.finalStatus === 'intact' ||
                candidate.finalStatus === 'ejected'
              ? deriveRosterReadiness(validated.recovery.combatState)
              : 'Damaged',
        },
        {
          ...updates,
          forces,
          unitCombatStates: {
            ...campaign.unitCombatStates,
            [candidate.unitId]: validated.recovery.combatState,
          },
        },
      );
    return result?.committed
      ? { applied: true }
      : refuse(result?.reason ?? 'The campaign is no longer loaded.');
  } catch (error) {
    return refuse(
      error instanceof Error ? error.message : 'Salvage recovery failed.',
    );
  }
}
