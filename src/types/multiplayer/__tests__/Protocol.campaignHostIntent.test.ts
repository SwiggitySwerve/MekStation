import {
  CampaignHostIntentSchema,
  ClientMessageSchema,
  nowIso,
} from '../Protocol';

describe('CampaignHostIntentSchema reconciliation intents', () => {
  const reconcileBattleFrame = {
    kind: 'CampaignHostIntent' as const,
    matchId: 'campaign-sync-match-1',
    ts: nowIso(),
    playerId: 'host-player-1',
    intent: {
      kind: 'ReconcileBattle' as const,
      campaignId: 'campaign-1',
      intentId: 'coop-recon-combat-match-1',
      payload: {
        campaignId: 'campaign-1',
        matchId: 'combat-match-1',
        fundsDelta: -25_000,
        fundsReason: 'Co-op mission resolution (combat-match-1)',
        salvageValue: 50_000,
        rosterChanges: [
          {
            unitId: 'unit-1',
            designation: 'Atlas AS7-D',
            status: 'destroyed' as const,
          },
        ],
      },
    },
  };

  it('round-trips a ReconcileBattle host intent through the client frame', () => {
    const parsed = CampaignHostIntentSchema.parse(reconcileBattleFrame);

    expect(parsed).toEqual(reconcileBattleFrame);
    expect(ClientMessageSchema.safeParse(reconcileBattleFrame).success).toBe(
      true,
    );
  });

  it('rejects an unknown host-intent kind', () => {
    const unknownHostIntent = {
      ...reconcileBattleFrame,
      intent: {
        ...reconcileBattleFrame.intent,
        kind: 'ResolveFutureBattle',
      },
    };

    expect(CampaignHostIntentSchema.safeParse(unknownHostIntent).success).toBe(
      false,
    );
    expect(ClientMessageSchema.safeParse(unknownHostIntent).success).toBe(
      false,
    );
  });
});
