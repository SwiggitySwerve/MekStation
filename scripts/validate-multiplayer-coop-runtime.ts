#!/usr/bin/env npx tsx

import type { IGuestProposal } from '@/types/campaign/CoopCampaign';

import {
  closeCoopRuntimeSession,
  openCoopRuntimeSession,
  submitGuestProposalToHost,
} from '@/lib/campaign/coop/coopRuntimeSession';
import { createCampaign } from '@/types/campaign/Campaign';
import { createHostCoopSession } from '@/types/campaign/CoopSession';

interface ICliArgs {
  readonly matchId: string;
  readonly roomCode: string;
}

function readArg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function parseArgs(): ICliArgs {
  const matchId = readArg('--match-id') ?? `coop-smoke-${Date.now()}`;
  const roomCode = readArg('--room-code') ?? 'ABC234';
  return { matchId, roomCode };
}

function spendProposal(matchId: string): IGuestProposal {
  return {
    proposalId: `proposal-${matchId}`,
    campaignId: `campaign-${matchId}`,
    proposingPlayerId: 'guest',
    ts: new Date().toISOString(),
    intent: {
      kind: 'SpendFunds',
      campaignId: `campaign-${matchId}`,
      intentId: `intent-${matchId}`,
      payload: { amount: 50_000, reason: 'Co-op runtime smoke' },
    },
  };
}

async function main(): Promise<void> {
  const { matchId, roomCode } = parseArgs();
  const campaign = {
    ...createCampaign('Co-op Runtime Smoke', 'mercenary', {
      startingFunds: 1_000_000,
    }),
    id: `campaign-${matchId}`,
    coopSession: createHostCoopSession(roomCode, matchId),
  };

  await openCoopRuntimeSession(campaign, {
    matchId,
    roomCode,
    hostPlayerId: 'host',
    arbitrationMode: 'auto-approve',
  });

  try {
    const result = await submitGuestProposalToHost(
      matchId,
      spendProposal(matchId),
    );
    if (result.status !== 'committed') {
      throw new Error(
        `Expected committed proposal, received ${JSON.stringify(result)}`,
      );
    }
    console.log(
      JSON.stringify(
        {
          ok: true,
          coopRuntimeProposal: 'committed',
          matchId,
          roomCode,
          eventCount: result.events.length,
        },
        null,
        2,
      ),
    );
  } finally {
    closeCoopRuntimeSession(matchId);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
