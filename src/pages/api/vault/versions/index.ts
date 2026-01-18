/**
 * Version History API
 *
 * GET /api/vault/versions?itemId=X&contentType=Y - Get version history
 * POST /api/vault/versions - Create a new version snapshot
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { IVersionSnapshot, IVersionHistorySummary, ShareableContentType } from '@/types/vault';
import { getVersionHistoryService } from '@/services/vault/VersionHistoryService';

// =============================================================================
// Types
// =============================================================================

interface CreateVersionRequest {
  contentType: ShareableContentType;
  itemId: string;
  content: string;
  createdBy: string;
  message?: string;
}

interface ListVersionsResponse {
  versions: IVersionSnapshot[];
  summary: IVersionHistorySummary;
}

interface CreateVersionResponse {
  version: IVersionSnapshot | null;
  skipped?: boolean;
}

interface ErrorResponse {
  error: string;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListVersionsResponse | CreateVersionResponse | ErrorResponse>
) {
  try {
    const versionService = getVersionHistoryService();

    switch (req.method) {
      case 'GET':
        return handleList(req, res, versionService);
      case 'POST':
        return handleCreate(req, res, versionService);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Versions API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

// =============================================================================
// Handlers
// =============================================================================

async function handleList(
  req: NextApiRequest,
  res: NextApiResponse<ListVersionsResponse | ErrorResponse>,
  versionService: ReturnType<typeof getVersionHistoryService>
) {
  const { itemId, contentType, limit } = req.query;

  if (typeof itemId !== 'string' || !itemId) {
    return res.status(400).json({ error: 'itemId is required' });
  }

  if (!isValidContentType(contentType)) {
    return res.status(400).json({ error: 'Invalid or missing contentType' });
  }

  const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : 50;

  const versions = await versionService.getHistory(itemId, contentType, limitNum);
  const summary = await versionService.getHistorySummary(itemId, contentType);

  return res.status(200).json({ versions, summary });
}

async function handleCreate(
  req: NextApiRequest,
  res: NextApiResponse<CreateVersionResponse | ErrorResponse>,
  versionService: ReturnType<typeof getVersionHistoryService>
) {
  const { contentType, itemId, content, createdBy, message } = req.body as CreateVersionRequest;

  if (!isValidContentType(contentType)) {
    return res.status(400).json({ error: 'Invalid contentType' });
  }

  if (!itemId || typeof itemId !== 'string') {
    return res.status(400).json({ error: 'itemId is required' });
  }

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content is required' });
  }

  if (!createdBy || typeof createdBy !== 'string') {
    return res.status(400).json({ error: 'createdBy is required' });
  }

  const version = await versionService.saveVersion(
    contentType,
    itemId,
    content,
    createdBy,
    { message, skipIfUnchanged: true }
  );

  if (!version) {
    // Content unchanged, version was skipped
    return res.status(200).json({ version: null, skipped: true });
  }

  return res.status(201).json({ version });
}

// =============================================================================
// Helpers
// =============================================================================

function isValidContentType(type: unknown): type is ShareableContentType {
  return ['unit', 'pilot', 'force', 'encounter'].includes(type as string);
}
