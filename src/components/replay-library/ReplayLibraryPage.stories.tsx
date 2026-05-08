/**
 * Storybook stories for the Replay Library page.
 *
 * The page fetches `/api/replay-library` on mount via `globalThis.fetch`.
 * Each story overrides `globalThis.fetch` in a decorator so the loading,
 * populated, empty, and error states render deterministically without
 * any backend.
 *
 * `<QuickGameReplayPanel>` — the click-to-open viewer — is exercised by
 * its own stories and unit tests; we don't drive it from these stories
 * because it pulls in the hex-map renderer and the audit timeline. The
 * stories cover the LIST and FILTER affordances, which is where this
 * page differs from the existing in-app replay tab.
 *
 * @spec openspec/changes/add-replay-library/specs/replay-library/spec.md
 */

import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { useEffect } from 'react';

import type { IReplayManifestEntry } from '@/replay-library/types';

import { GameSide, ReplaySource } from '@/types/gameplay';

import ReplayLibraryPage from './ReplayLibraryPage';

// =============================================================================
// Fixture entries (one per ReplaySource so the populated story shows the
// full discriminated-union narrowing surface).
// =============================================================================

const swarmEntry: IReplayManifestEntry = {
  id: 'sim-42',
  replaySource: ReplaySource.Swarm,
  path: 'swarm/sim-42.jsonl',
  createdAt: '2026-05-07T05:52:10.802Z',
  turns: 12,
  winner: GameSide.Player,
  bvTotal: 6240,
  configName: 'duel-3kbv-temperate',
  seed: 42,
  batchTimestamp: '2026-05-07T05-52-10-802Z',
};

const swarmEntry2: IReplayManifestEntry = {
  id: 'sim-99',
  replaySource: ReplaySource.Swarm,
  path: 'swarm/sim-99.jsonl',
  createdAt: '2026-05-07T06:05:33.118Z',
  turns: 8,
  winner: GameSide.Opponent,
  bvTotal: 5800,
  configName: 'lance-ambush-rocky',
  seed: 99,
  batchTimestamp: '2026-05-07T06-05-33-118Z',
};

const quickEntry: IReplayManifestEntry = {
  id: 'quick-2026-05-07T07-12-44',
  replaySource: ReplaySource.Quick,
  path: 'quick/quick-2026-05-07T07-12-44.jsonl',
  createdAt: '2026-05-07T07:12:44.500Z',
  turns: 5,
  winner: GameSide.Player,
  bvTotal: 3120,
  aiVariant: 'aggressive-v2',
  playerSide: GameSide.Player,
};

const pvpEntry: IReplayManifestEntry = {
  id: 'pvp-match-1024',
  replaySource: ReplaySource.PvP,
  path: 'pvp/pvp-match-1024.jsonl',
  createdAt: '2026-05-06T22:40:00.000Z',
  turns: 11,
  winner: GameSide.Opponent,
  bvTotal: 7400,
  opponentName: 'CmdrShrike',
  matchId: 'match-1024',
};

const campaignEntry: IReplayManifestEntry = {
  id: 'campaign-mission-7',
  replaySource: ReplaySource.Campaign,
  path: 'campaign/campaign-mission-7.jsonl',
  createdAt: '2026-05-06T18:15:22.000Z',
  turns: 14,
  winner: GameSide.Player,
  bvTotal: 8650,
  campaignId: 'rim-collection-2026',
  missionId: 'mission-7',
  difficulty: 'veteran',
};

// =============================================================================
// Fetch decorator factory — installs a deterministic `globalThis.fetch`
// for each story and restores the original on unmount.
// =============================================================================

interface FetchScenario {
  readonly listResponse?: {
    readonly entries: readonly IReplayManifestEntry[];
    readonly total: number;
  };
  readonly listError?: boolean;
  readonly listPending?: boolean;
}

function makeFetchDecorator(scenario: FetchScenario): Decorator {
  return (Story) => {
    useEffect(() => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = ((url: string) => {
        if (scenario.listPending) {
          return new Promise(() => {
            /* never resolves — story pinned to loading state */
          });
        }
        if (url === '/api/replay-library') {
          if (scenario.listError) {
            return Promise.resolve({
              ok: false,
              status: 500,
              json: () => Promise.resolve({ error: 'mocked failure' }),
            } as Response);
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve(
                scenario.listResponse ?? { entries: [], total: 0 },
              ),
          } as Response);
        }
        // Storybook should not invoke event-load endpoints — the Watch
        // button mounts QuickGameReplayPanel which has its own stories.
        return Promise.reject(
          new Error(`[storybook] unexpected fetch: ${url}`),
        );
      }) as typeof fetch;

      return () => {
        globalThis.fetch = originalFetch;
      };
    }, []);

    return <Story />;
  };
}

// =============================================================================
// Meta
// =============================================================================

const meta: Meta<typeof ReplayLibraryPage> = {
  title: 'Pages/ReplayLibraryPage',
  component: ReplayLibraryPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    nextRouter: {
      pathname: '/replay-library',
      query: {},
    },
  },
};

export default meta;
type Story = StoryObj<typeof ReplayLibraryPage>;

// =============================================================================
// Stories
// =============================================================================

export const PopulatedLibrary: Story = {
  decorators: [
    makeFetchDecorator({
      listResponse: {
        entries: [swarmEntry, swarmEntry2, quickEntry, pvpEntry, campaignEntry],
        total: 5,
      },
    }),
  ],
};

export const EmptyLibrary: Story = {
  decorators: [
    makeFetchDecorator({
      listResponse: { entries: [], total: 0 },
    }),
  ],
};

export const SwarmOnly: Story = {
  decorators: [
    makeFetchDecorator({
      listResponse: {
        entries: [swarmEntry, swarmEntry2],
        total: 2,
      },
    }),
  ],
};

export const LoadingState: Story = {
  decorators: [makeFetchDecorator({ listPending: true })],
};

export const ErrorState: Story = {
  decorators: [makeFetchDecorator({ listError: true })],
};
