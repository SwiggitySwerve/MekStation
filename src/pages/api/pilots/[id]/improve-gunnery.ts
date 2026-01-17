/**
 * Pilots API - Improve Gunnery
 *
 * POST /api/pilots/[id]/improve-gunnery - Improve gunnery skill (enforces XP cost)
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { getPilotService } from '@/services/pilots';

type Response = {
  success: boolean;
  error?: string;
  newGunnery?: number;
  xpSpent?: number;
  xpRemaining?: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Response>
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ success: false, error: message });
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid pilot ID' });
  }

  const pilotService = getPilotService();

  // Get pilot before improvement to report XP cost
  const pilot = pilotService.getPilot(id);
  if (!pilot) {
    return res.status(404).json({ success: false, error: `Pilot ${id} not found` });
  }

  const { canImprove, cost } = pilotService.canImproveGunnery(pilot);
  if (!canImprove) {
    const reason = cost === null 
      ? 'Gunnery is already at maximum (1)'
      : `Insufficient XP. Need ${cost}, have ${pilot.career?.xp || 0}`;
    return res.status(400).json({ success: false, error: reason });
  }

  // Perform improvement (validates and deducts XP in service)
  const result = pilotService.improveGunnery(id);

  if (result.success) {
    const updatedPilot = pilotService.getPilot(id);
    return res.status(200).json({
      success: true,
      newGunnery: updatedPilot?.skills.gunnery,
      xpSpent: cost ?? 0,
      xpRemaining: updatedPilot?.career?.xp ?? 0,
    });
  } else {
    return res.status(400).json({
      success: false,
      error: result.error || 'Failed to improve gunnery',
    });
  }
}
