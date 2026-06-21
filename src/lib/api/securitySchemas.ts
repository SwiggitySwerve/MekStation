import { z } from 'zod';

import { TeamLayoutSchema } from '@/types/multiplayer/Lobby';

const PASSWORD_MAX_LENGTH = 512;
const DISPLAY_NAME_MAX_LENGTH = 64;
const ID_MAX_LENGTH = 128;

const OptionalEntityIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(ID_MAX_LENGTH)
  .nullable()
  .optional();

export const TokenIssueBodySchema = z
  .object({
    password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
    displayName: z
      .string()
      .trim()
      .min(1)
      .max(DISPLAY_NAME_MAX_LENGTH)
      .optional(),
    ttlMs: z
      .number()
      .finite()
      .int()
      .positive()
      .max(6 * 60 * 60 * 1000)
      .optional(),
  })
  .strict();

export const UnlockIdentityBodySchema = z
  .object({
    password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  })
  .strict();

const PlayerIdSchema = z.string().trim().min(1).max(ID_MAX_LENGTH);

const SideAssignmentSchema = z
  .object({
    playerId: PlayerIdSchema,
    side: z.enum(['player', 'opponent']),
  })
  .strict();

const MatchConfigSchema = z
  .object({
    mapRadius: z.number().finite().int().min(1).max(50),
    turnLimit: z.number().finite().int().min(1).max(200),
    fogOfWar: z.boolean().optional(),
    optionalRules: z.array(z.string().trim().min(1).max(80)).max(32).optional(),
    contractId: OptionalEntityIdSchema,
    scenarioId: OptionalEntityIdSchema,
    encounterId: OptionalEntityIdSchema,
  })
  .strict();

export const CreateMultiplayerMatchBodySchema = z
  .object({
    config: MatchConfigSchema,
    displayName: z
      .string()
      .trim()
      .min(1)
      .max(DISPLAY_NAME_MAX_LENGTH)
      .optional(),
    playerIds: z.array(PlayerIdSchema).min(1).max(8).optional(),
    sideAssignments: z.array(SideAssignmentSchema).min(1).max(8).optional(),
    layout: TeamLayoutSchema.optional(),
    aiSlots: z.array(z.string().trim().min(1).max(64)).max(8).optional(),
  })
  .strict()
  .refine((body) => body.layout !== undefined || body.playerIds !== undefined, {
    message: 'Either layout or playerIds is required',
    path: ['layout'],
  })
  .refine((body) => body.layout !== undefined || body.aiSlots === undefined, {
    message: 'aiSlots require a layout',
    path: ['aiSlots'],
  });

export type TokenIssueBody = z.infer<typeof TokenIssueBodySchema>;
export type UnlockIdentityBody = z.infer<typeof UnlockIdentityBodySchema>;
export type CreateMultiplayerMatchBody = z.infer<
  typeof CreateMultiplayerMatchBodySchema
>;
