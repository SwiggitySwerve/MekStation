/**
 * Pilots API - Purchase Ability
 *
 * POST /api/pilots/[id]/purchase-ability - Purchase an ability (enforces XP cost and prerequisites)
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { getPilotService, getPilotRepository } from '@/services/pilots';
import { getAbility, meetsPrerequisites } from '@/types/pilot';

interface RequestBody {
  abilityId: string;
}

type Response = {
  success: boolean;
  error?: string;
  abilityId?: string;
  xpSpent?: number;
  xpRemaining?: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>,
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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

  const body = req.body as RequestBody;
  if (!body.abilityId) {
    return res
      .status(400)
      .json({ success: false, error: 'Missing abilityId in request body' });
  }

  const pilotService = getPilotService();
  const pilotRepository = getPilotRepository();

  // Get pilot
  const pilot = pilotService.getPilot(id);
  if (!pilot) {
    return res
      .status(404)
      .json({ success: false, error: `Pilot ${id} not found` });
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
  const spendResult = pilotRepository.spendXp(id, ability.xpCost);
  if (!spendResult.success) {
    return res.status(400).json({
      success: false,
      error: spendResult.error || 'Failed to spend XP',
    });
  }

  // Add ability
  const addResult = pilotRepository.addAbility(id, body.abilityId);
  if (!addResult.success) {
    // Refund XP if ability add failed
    pilotRepository.addXp(id, ability.xpCost);
    return res.status(400).json({
      success: false,
      error: addResult.error || 'Failed to add ability',
    });
  }

  // Get updated pilot for response
  const updatedPilot = pilotService.getPilot(id);

  return res.status(200).json({
    success: true,
    abilityId: body.abilityId,
    xpSpent: ability.xpCost,
    xpRemaining: updatedPilot?.career?.xp ?? 0,
  });
}
