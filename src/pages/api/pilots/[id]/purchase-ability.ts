/**
 * Pilots API - Purchase / Remove Ability
 *
 * POST   /api/pilots/[id]/purchase-ability  — purchase an ability or SPA
 * DELETE /api/pilots/[id]/purchase-ability  — remove an SPA (creation flow only)
 *
 * Phase 5 Wave 2a (add-pilot-spa-editor-integration) extended this route
 * with three things:
 *   1. Optional `spaId` body field — selects the unified SPA path
 *      (PilotService.purchaseSPA) which handles flaws + origin-only
 *      gating + designation persistence. The legacy `abilityId` field
 *      keeps the pre-Phase-5 catalog path working.
 *   2. Optional `designation` body field — passed through to the SPA
 *      service when the picker confirms a Weapon Specialist / Range
 *      Master / etc. selection.
 *   3. Optional `isCreationFlow` body field — required for origin-only
 *      SPAs and for the DELETE branch (removal).
 *
 * Backward compatibility: clients posting only `{ abilityId }` keep
 * working exactly as before.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 * @spec openspec/changes/add-pilot-spa-editor-integration/proposal.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { getPilotRepository, getPilotService } from '@/services/pilots';
import {
  IPilotAbilityDesignation,
  getAbility,
  meetsPrerequisites,
} from '@/types/pilot';

interface PurchaseRequestBody {
  /** Legacy SPECIAL_ABILITIES id — uses the pre-Phase-5 catalog path. */
  abilityId?: string;
  /** Phase 5 unified SPA id — uses the SPA editor path with designation
   *  + flaw + origin-only gating. */
  spaId?: string;
  /** Optional designation payload chosen in the picker (Wave 2a stub
   *  shape — Wave 2b replaces with a typed discriminated union). */
  designation?: IPilotAbilityDesignation;
  /** Pilot is in the creation window — enables flaws + origin-only. */
  isCreationFlow?: boolean;
}

interface RemoveRequestBody {
  /** SPA id to remove. */
  spaId: string;
  /** Removal is creation-flow only per spec task 6.1. */
  isCreationFlow?: boolean;
}

type Response = {
  success: boolean;
  error?: string;
  abilityId?: string;
  spaId?: string;
  xpSpent?: number;
  xpRemaining?: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>,
): Promise<void> {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['POST', 'DELETE']);
    return res
      .status(405)
      .json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ success: false, error: message });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid pilot ID' });
  }

  if (req.method === 'DELETE') {
    return handleRemove(req, res, id);
  }
  return handlePurchase(req, res, id);
}

/**
 * POST handler — supports both the legacy ability path and the new
 * unified SPA path. The branch is selected by which of `spaId` /
 * `abilityId` is present in the body.
 */
async function handlePurchase(
  req: NextApiRequest,
  res: NextApiResponse<Response>,
  pilotId: string,
): Promise<void> {
  const body = req.body as PurchaseRequestBody;

  const pilotService = getPilotService();
  const pilotRepository = getPilotRepository();

  // -------------------------------------------------------------------------
  // SPA path (Phase 5 Wave 2a)
  // -------------------------------------------------------------------------
  if (body.spaId) {
    const result = pilotService.purchaseSPA(pilotId, body.spaId, {
      designation: body.designation,
      isCreationFlow: body.isCreationFlow,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to purchase SPA',
      });
    }

    const updated = pilotService.getPilot(pilotId);
    return res.status(200).json({
      success: true,
      spaId: body.spaId,
      xpRemaining: updated?.career?.xp ?? 0,
    });
  }

  // -------------------------------------------------------------------------
  // Legacy ability path — preserved for the pre-Phase-5 catalog UI.
  // -------------------------------------------------------------------------
  if (!body.abilityId) {
    return res
      .status(400)
      .json({ success: false, error: 'Missing abilityId or spaId in body' });
  }

  // Get pilot
  const pilot = pilotService.getPilot(pilotId);
  if (!pilot) {
    return res
      .status(404)
      .json({ success: false, error: `Pilot ${pilotId} not found` });
  }

  // Get ability
  const ability = getAbility(body.abilityId);
  if (!ability) {
    return res
      .status(400)
      .json({ success: false, error: `Unknown ability: ${body.abilityId}` });
  }

  // Check if already owned
  const alreadyOwned = pilot.abilities.some(
    (a) => a.abilityId === body.abilityId,
  );
  if (alreadyOwned) {
    return res.status(400).json({
      success: false,
      error: `Pilot already has ability: ${ability.name}`,
    });
  }

  // Check prerequisites
  const ownedAbilityIds = pilot.abilities.map((a) => a.abilityId);
  const prereqCheck = meetsPrerequisites(
    body.abilityId,
    pilot.skills.gunnery,
    pilot.skills.piloting,
    ownedAbilityIds,
  );

  if (!prereqCheck.meets) {
    return res.status(400).json({
      success: false,
      error: `Prerequisites not met: ${prereqCheck.missing.join(', ')}`,
    });
  }

  // Check XP
  const availableXp = pilot.career?.xp ?? 0;
  if (availableXp < ability.xpCost) {
    return res.status(400).json({
      success: false,
      error: `Insufficient XP. Need ${ability.xpCost}, have ${availableXp}`,
    });
  }

  // Spend XP
  const spendResult = pilotRepository.spendXp(pilotId, ability.xpCost);
  if (!spendResult.success) {
    return res.status(400).json({
      success: false,
      error: spendResult.error || 'Failed to spend XP',
    });
  }

  // Add ability
  const addResult = pilotRepository.addAbility(pilotId, body.abilityId);
  if (!addResult.success) {
    // Refund XP if ability add failed
    pilotRepository.addXp(pilotId, ability.xpCost);
    return res.status(400).json({
      success: false,
      error: addResult.error || 'Failed to add ability',
    });
  }

  // Get updated pilot for response
  const updatedPilot = pilotService.getPilot(pilotId);

  return res.status(200).json({
    success: true,
    abilityId: body.abilityId,
    xpSpent: ability.xpCost,
    xpRemaining: updatedPilot?.career?.xp ?? 0,
  });
}

/**
 * DELETE handler — removes an SPA and refunds the recorded XP cost. Only
 * permitted when `isCreationFlow === true` per the SPA editor spec.
 */
async function handleRemove(
  req: NextApiRequest,
  res: NextApiResponse<Response>,
  pilotId: string,
): Promise<void> {
  const body = req.body as RemoveRequestBody;
  if (!body || !body.spaId) {
    return res
      .status(400)
      .json({ success: false, error: 'Missing spaId in request body' });
  }

  const pilotService = getPilotService();
  const result = pilotService.removeSPA(pilotId, body.spaId, {
    isCreationFlow: body.isCreationFlow,
  });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error || 'Failed to remove SPA',
    });
  }

  const updated = pilotService.getPilot(pilotId);
  return res.status(200).json({
    success: true,
    spaId: body.spaId,
    xpRemaining: updated?.career?.xp ?? 0,
  });
}
