/**
 * Pilots API - List and Create
 *
 * GET /api/pilots - List all pilots
 * POST /api/pilots - Create a new pilot
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { getPilotService, IPilotOperationResult } from '@/services/pilots';
import { IPilot, ICreatePilotOptions, PilotExperienceLevel } from '@/types/pilot';

// =============================================================================
// Response Types
// =============================================================================

type ListResponse = {
  pilots: readonly IPilot[];
  count: number;
};

type CreateResponse = IPilotOperationResult & {
  pilot?: IPilot;
};

type ErrorResponse = {
  error: string;
  code?: string;
};

// =============================================================================
// Request Types
// =============================================================================

interface CreatePilotBody {
  mode: 'full' | 'template' | 'random';
  // For 'full' mode
  options?: ICreatePilotOptions;
  // For 'template' mode
  template?: PilotExperienceLevel;
  // For 'template' and 'random' mode
  identity?: {
    name: string;
    callsign?: string;
    affiliation?: string;
    portrait?: string;
    background?: string;
  };
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | CreateResponse | ErrorResponse>
): Promise<void> {
  // Initialize database
  try {
    getSQLiteService().initialize();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database initialization failed';
    return res.status(500).json({ error: message });
  }

  const pilotService = getPilotService();

  switch (req.method) {
    case 'GET':
      return handleGet(pilotService, req, res);
    case 'POST':
      return handlePost(pilotService, req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

/**
 * GET /api/pilots - List all pilots
 */
function handleGet(
  pilotService: ReturnType<typeof getPilotService>,
  req: NextApiRequest,
  res: NextApiResponse<ListResponse | ErrorResponse>
) {
  try {
    const { status } = req.query;

    let pilots: readonly IPilot[];
    if (status === 'active') {
      pilots = pilotService.listActivePilots();
    } else {
      pilots = pilotService.listPilots();
    }

    return res.status(200).json({
      pilots,
      count: pilots.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list pilots';
    return res.status(500).json({ error: message });
  }
}

/**
 * POST /api/pilots - Create a new pilot
 */
function handlePost(
  pilotService: ReturnType<typeof getPilotService>,
  req: NextApiRequest,
  res: NextApiResponse<CreateResponse | ErrorResponse>
) {
  try {
    const body = req.body as CreatePilotBody;

    if (!body.mode) {
      return res.status(400).json({
        error: 'Missing required field: mode (full | template | random)',
      });
    }

    let result: IPilotOperationResult;

    switch (body.mode) {
      case 'full':
        if (!body.options) {
          return res.status(400).json({
            error: 'Missing required field: options (for full mode)',
          });
        }
        result = pilotService.createPilot(body.options);
        break;

      case 'template':
        if (!body.template || !body.identity) {
          return res.status(400).json({
            error: 'Missing required fields: template, identity (for template mode)',
          });
        }
        result = pilotService.createFromTemplate(body.template, body.identity);
        break;

      case 'random':
        if (!body.identity) {
          return res.status(400).json({
            error: 'Missing required field: identity (for random mode)',
          });
        }
        result = pilotService.createRandom(body.identity);
        break;

      default:
        return res.status(400).json({
          error: `Invalid mode: ${body.mode}. Must be full, template, or random`,
        });
    }

    if (result.success && result.id) {
      const pilot = pilotService.getPilot(result.id);
      return res.status(201).json({ ...result, pilot: pilot || undefined });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to create pilot',
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create pilot';
    return res.status(500).json({ error: message });
  }
}
