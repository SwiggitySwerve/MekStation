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

const HexCoordinateSchema = z
  .object({
    q: z.number().finite().int().min(-50).max(50),
    r: z.number().finite().int().min(-50).max(50),
  })
  .strict();

const MatchUnitBootstrapEntrySchema = z
  .object({
    unitId: z.string().trim().min(1).max(ID_MAX_LENGTH),
    unitRef: z.string().trim().min(1).max(ID_MAX_LENGTH),
    side: z.enum(['player', 'opponent']),
    name: z.string().trim().min(1).max(128).optional(),
    pilotRef: z.string().trim().min(1).max(ID_MAX_LENGTH).optional(),
    gunnery: z.number().finite().int().min(0).max(8).optional(),
    piloting: z.number().finite().int().min(0).max(8).optional(),
    startHex: HexCoordinateSchema.optional(),
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

const CampaignRosterUnitSchema = z
  .object({
    unitId: z.string().trim().min(1).max(ID_MAX_LENGTH),
    designation: z.string().trim().min(1).max(128),
    status: z.enum(['operational', 'damaged', 'destroyed']),
  })
  .strict();

const CampaignRosterPilotSchema = z
  .object({
    pilotId: z.string().trim().min(1).max(ID_MAX_LENGTH),
    name: z.string().trim().min(1).max(128),
  })
  .strict();

const CampaignAcceptedContractSchema = z
  .object({
    contractId: z.string().trim().min(1).max(ID_MAX_LENGTH),
    name: z.string().trim().min(1).max(128),
    employerFactionId: z.string().trim().min(1).max(ID_MAX_LENGTH),
  })
  .strict();

const CampaignAuthoritativeStateSchema = z
  .object({
    campaignId: z.string().trim().min(1).max(ID_MAX_LENGTH),
    day: z.number().finite().int().nonnegative(),
    balance: z.number().finite(),
    rosterUnits: z.record(z.string(), CampaignRosterUnitSchema),
    pilots: z.record(z.string(), CampaignRosterPilotSchema),
    contracts: z.record(z.string(), CampaignAcceptedContractSchema),
    factionStanding: z.record(z.string(), z.number().finite()),
    salvagePool: z.number().finite().nonnegative(),
  })
  .strict();

const CoopCampaignRegistrationSchema = z
  .object({
    campaignId: z.string().trim().min(1).max(ID_MAX_LENGTH),
    state: CampaignAuthoritativeStateSchema,
    arbitrationMode: z.enum(['auto-approve', 'host-review']).optional(),
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
    unitBootstrap: z
      .array(MatchUnitBootstrapEntrySchema)
      .min(1)
      .max(8)
      .optional(),
    layout: TeamLayoutSchema.optional(),
    aiSlots: z.array(z.string().trim().min(1).max(64)).max(8).optional(),
    coopCampaign: CoopCampaignRegistrationSchema.optional(),
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
