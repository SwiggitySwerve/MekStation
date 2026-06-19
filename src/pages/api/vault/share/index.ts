/**
 * Share Links API
 *
 * GET - List all share links
 * POST - Create a new share link
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import type {
  PermissionLevel,
  PermissionScopeType,
  ContentCategory,
} from '@/types/vault';

import { getShareLinkService } from '@/services/vault/ShareLinkService';

// =============================================================================
// Request Body Types
// =============================================================================

interface CreateShareLinkBody {
  scopeType?: unknown;
  scopeId?: unknown;
  scopeCategory?: unknown;
  level?: unknown;
  expiresAt?: unknown;
  maxUses?: unknown;
  label?: unknown;
}

interface ValidationSuccess<T> {
  readonly ok: true;
  readonly value: T;
}

interface ValidationFailure {
  readonly ok: false;
  readonly error: string;
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

interface ShareScopeInput {
  readonly scopeType: PermissionScopeType;
  readonly scopeId: string | null;
  readonly scopeCategory: ContentCategory | null;
  readonly level: PermissionLevel;
}

interface ShareOptionInput {
  readonly expiresAt: string | null;
  readonly maxUses: number | null;
  readonly label?: string;
}

const VALID_SCOPE_TYPES = ['item', 'folder', 'category', 'all'];
const VALID_PERMISSION_LEVELS = ['read', 'write', 'admin'];
const VALID_SCOPE_CATEGORIES = ['units', 'pilots', 'forces', 'encounters'];

function validationError(error: string): ValidationFailure {
  return { ok: false, error };
}

function isValidScopeType(value: string): value is PermissionScopeType {
  return VALID_SCOPE_TYPES.includes(value);
}

function isValidPermissionLevel(value: string): value is PermissionLevel {
  return VALID_PERMISSION_LEVELS.includes(value);
}

function isValidScopeCategory(value: string): value is ContentCategory {
  return VALID_SCOPE_CATEGORIES.includes(value);
}

function parseShareScope(
  body: CreateShareLinkBody,
): ValidationResult<ShareScopeInput> {
  if (!body.scopeType || typeof body.scopeType !== 'string') {
    return validationError('scopeType is required');
  }
  if (!isValidScopeType(body.scopeType)) {
    return validationError(
      'scopeType must be one of: item, folder, category, all',
    );
  }
  if (!body.level || typeof body.level !== 'string') {
    return validationError('level is required');
  }
  if (!isValidPermissionLevel(body.level)) {
    return validationError('level must be one of: read, write, admin');
  }

  const scopeInput = parseScopeTarget(body, body.scopeType);
  if (!scopeInput.ok) return scopeInput;

  return {
    ok: true,
    value: {
      scopeType: body.scopeType,
      level: body.level,
      ...scopeInput.value,
    },
  };
}

function parseScopeTarget(
  body: CreateShareLinkBody,
  scopeType: PermissionScopeType,
): ValidationResult<Pick<ShareScopeInput, 'scopeId' | 'scopeCategory'>> {
  if (scopeType === 'item' || scopeType === 'folder') {
    if (!body.scopeId || typeof body.scopeId !== 'string') {
      return validationError('scopeId is required for item/folder scope');
    }
    return { ok: true, value: { scopeId: body.scopeId, scopeCategory: null } };
  }

  if (scopeType === 'category') {
    return parseCategoryScope(body.scopeCategory);
  }

  return { ok: true, value: { scopeId: null, scopeCategory: null } };
}

function parseCategoryScope(
  scopeCategory: unknown,
): ValidationResult<Pick<ShareScopeInput, 'scopeId' | 'scopeCategory'>> {
  if (!scopeCategory || typeof scopeCategory !== 'string') {
    return validationError('scopeCategory is required for category scope');
  }
  if (!isValidScopeCategory(scopeCategory)) {
    return validationError(
      'scopeCategory must be one of: units, pilots, forces, encounters',
    );
  }
  return { ok: true, value: { scopeId: null, scopeCategory } };
}

function parseShareOptions(
  body: CreateShareLinkBody,
): ValidationResult<ShareOptionInput> {
  const expiresAt = parseExpiresAt(body.expiresAt);
  if (!expiresAt.ok) return expiresAt;

  const maxUses = parseMaxUses(body.maxUses);
  if (!maxUses.ok) return maxUses;

  const label = parseShareLabel(body.label);
  if (!label.ok) return label;

  return {
    ok: true,
    value: {
      expiresAt: expiresAt.value,
      maxUses: maxUses.value,
      label: label.value,
    },
  };
}

function parseExpiresAt(value: unknown): ValidationResult<string | null> {
  if (value === undefined) return { ok: true, value: null };
  if (typeof value !== 'string') {
    return validationError('expiresAt must be a string');
  }
  if (Number.isNaN(new Date(value).getTime())) {
    return validationError('expiresAt must be a valid ISO date');
  }
  return { ok: true, value };
}

function parseMaxUses(value: unknown): ValidationResult<number | null> {
  if (value === undefined) return { ok: true, value: null };
  if (typeof value !== 'number' || value < 1) {
    return validationError('maxUses must be a positive number');
  }
  return { ok: true, value: Math.floor(value) };
}

function parseShareLabel(value: unknown): ValidationResult<string | undefined> {
  if (value === undefined) return { ok: true, value: undefined };
  if (typeof value !== 'string') {
    return validationError('label must be a string');
  }
  return { ok: true, value: value.trim() || undefined };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const service = getShareLinkService();

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, service);
    case 'POST':
      return handlePost(req, res, service);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET - List all share links
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  service: ReturnType<typeof getShareLinkService>,
) {
  try {
    const { active } = req.query;

    const links =
      active === 'true'
        ? await service.getActiveLinks()
        : await service.getAllLinks();

    return res.status(200).json({
      links,
      count: links.length,
    });
  } catch (error) {
    console.error('Failed to list share links:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to list share links',
    });
  }
}

/**
 * POST - Create a new share link
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  service: ReturnType<typeof getShareLinkService>,
) {
  try {
    const body = req.body as CreateShareLinkBody;
    const scope = parseShareScope(body);
    if (!scope.ok) return res.status(400).json({ error: scope.error });

    const options = parseShareOptions(body);
    if (!options.ok) return res.status(400).json({ error: options.error });

    // Create the share link
    const result = await service.create({
      ...scope.value,
      ...options.value,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(201).json({
      success: true,
      link: result.link,
      url: result.url,
    });
  } catch (error) {
    console.error('Failed to create share link:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to create share link',
    });
  }
}
