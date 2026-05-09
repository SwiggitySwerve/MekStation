/**
 * EncounterCard Storybook Stories
 *
 * Visual fixtures for every meaningful permutation of the encounter
 * row pill block:
 *   - `valid`         — both forces resolved, gray pills
 *   - `no-player`     — empty player slot (yellow "No Player Force")
 *   - `no-opponent`   — empty opponent slot, no opForConfig
 *   - `opfor-config`  — empty opponent slot but `opForConfig` set
 *   - `player-missing`    — broken player (yellow "Player force missing")
 *   - `opponent-missing`  — broken opponent (yellow "Opponent force missing")
 *   - `both-missing`      — both sides broken (the worst-case row a
 *                           user might land on after a force purge)
 *
 * @spec openspec/changes/repair-broken-encounter-drafts/specs/game-session-management/spec.md
 *       (Requirement: Encounter List Surfaces Broken-Reference State)
 */

import type { Meta, StoryObj } from '@storybook/react';

import {
  EncounterStatus,
  PilotSkillTemplate,
  ScenarioTemplateType,
  TerrainPreset,
  VictoryConditionType,
  type IEncounter,
  type IForceReference,
  type IOpForConfig,
} from '@/types/encounter';

import { EncounterCard } from './EncounterCard';

// =============================================================================
// Test fixtures
// =============================================================================

function makeEncounter(overrides: Partial<IEncounter> = {}): IEncounter {
  return {
    id: 'enc-story',
    name: 'Sample Battle - 2026-05-08',
    description:
      'Lance vs lance skirmish on the Hesperus II ridge. Generated for the storybook fixture.',
    status: EncounterStatus.Draft,
    template: ScenarioTemplateType.Skirmish,
    playerForce: undefined,
    opponentForce: undefined,
    opForConfig: undefined,
    mapConfig: {
      radius: 6,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
    optionalRules: [],
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-08T12:34:56.000Z',
    ...overrides,
  };
}

const PLAYER_REF: IForceReference = {
  forceId: 'force-alpha-lance',
  forceName: 'Alpha Lance',
  totalBV: 5400,
  unitCount: 4,
};

const OPPONENT_REF: IForceReference = {
  forceId: 'force-clan-star',
  forceName: 'Clan Smoke Jaguar Star',
  totalBV: 5800,
  unitCount: 4,
};

const OPFOR_CFG: IOpForConfig = {
  targetBVPercent: 100,
  pilotSkillTemplate: PilotSkillTemplate.Veteran,
};

// =============================================================================
// Meta
// =============================================================================

const meta: Meta<typeof EncounterCard> = {
  title: 'Gameplay/EncounterCard',
  component: EncounterCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Single row on `/gameplay/encounters`. Renders broken-pill state when the encounter has a forceId stored on disk but the hydrated `playerForce`/`opponentForce` came back null (force was deleted).',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: {
    onClick: () => {
      // No-op in storybook — click is wired to router.push at the
      // page level in production.
    },
  },
};

export default meta;
type Story = StoryObj<typeof EncounterCard>;

// =============================================================================
// Stories
// =============================================================================

export const Valid: Story = {
  args: {
    encounter: makeEncounter({
      id: 'enc-valid',
      name: 'Valid Encounter',
      status: EncounterStatus.Ready,
      playerForce: PLAYER_REF,
      opponentForce: OPPONENT_REF,
    }),
    rawForceIds: {
      playerForceId: PLAYER_REF.forceId,
      opponentForceId: OPPONENT_REF.forceId,
    },
  },
};

export const NoPlayerForce: Story = {
  args: {
    encounter: makeEncounter({
      id: 'enc-no-player',
      name: 'Empty Player Slot',
      playerForce: undefined,
      opponentForce: OPPONENT_REF,
    }),
    rawForceIds: {
      playerForceId: null,
      opponentForceId: OPPONENT_REF.forceId,
    },
  },
};

export const NoOpponent: Story = {
  args: {
    encounter: makeEncounter({
      id: 'enc-no-opp',
      name: 'No Opponent Configured',
      playerForce: PLAYER_REF,
      opponentForce: undefined,
      opForConfig: undefined,
    }),
    rawForceIds: {
      playerForceId: PLAYER_REF.forceId,
      opponentForceId: null,
    },
  },
};

export const OpforConfigured: Story = {
  args: {
    encounter: makeEncounter({
      id: 'enc-opfor',
      name: 'OpFor Generation Enabled',
      playerForce: PLAYER_REF,
      opponentForce: undefined,
      opForConfig: OPFOR_CFG,
    }),
    rawForceIds: {
      playerForceId: PLAYER_REF.forceId,
      opponentForceId: null,
    },
  },
};

export const PlayerMissing: Story = {
  args: {
    encounter: makeEncounter({
      id: 'enc-broken-p',
      name: 'Player Force Was Deleted',
      // null is the explicit "stored but unresolved" hydration signal.
      playerForce: null,
      opponentForce: OPPONENT_REF,
    }),
    rawForceIds: {
      playerForceId: 'force-alpha-deleted',
      opponentForceId: OPPONENT_REF.forceId,
    },
  },
};

export const OpponentMissing: Story = {
  args: {
    encounter: makeEncounter({
      id: 'enc-broken-o',
      name: 'Opponent Force Was Deleted',
      playerForce: PLAYER_REF,
      opponentForce: null,
    }),
    rawForceIds: {
      playerForceId: PLAYER_REF.forceId,
      opponentForceId: 'force-clan-deleted',
    },
  },
};

export const BothMissing: Story = {
  args: {
    encounter: makeEncounter({
      id: 'enc-broken-both',
      name: 'Both Forces Deleted',
      playerForce: null,
      opponentForce: null,
    }),
    rawForceIds: {
      playerForceId: 'force-alpha-deleted',
      opponentForceId: 'force-clan-deleted',
    },
  },
};
