import type { ICampaign } from '@/types/campaign/Campaign';
import type { IContract } from '@/types/campaign/Mission';

/**
 * How scenario generation reads a contract's enemy morale level.
 *
 * Pin: MekHQ e7adc2c.
 *  - A ROUTED enemy yields no random scenario: `StratConRulesManager.java:4492-4495`
 *    (`calculateScenarioOdds` returns -1). Every other level leaves the odds of an
 *    ordinary scenario untouched (the +/- modifiers at `:4499-4506` apply to
 *    reinforcement scenarios only, which MekStation has no model for).
 *  - There is no morale modifier on a scenario-type roll anywhere in the pin; the
 *    weekly AtB generator that had one is retired (`CampaignNewDayManager.java:2292-2293`).
 *
 * So morale changes the scenario mix only at ROUTED (none), and every other level
 * draws from the same tables with the same roll as STALEMATE.
 *
 * @spec openspec/changes/fix-contract-morale-readers/specs/scenario-generation/spec.md
 */
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import { CampaignType } from '@/types/campaign/CampaignType';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { Money } from '@/types/campaign/Money';
import {
  AtBMoraleLevel,
  CombatRole,
  type ICombatTeam,
} from '@/types/campaign/scenario/scenarioTypes';

import {
  selectFrontlineScenario,
  selectManeuverScenario,
  selectPatrolScenario,
  selectScenarioType,
  selectTrainingScenario,
} from '../../scenario/scenarioTypeSelection';
import { createScenarioGenerationProcessor } from '../scenarioGenerationProcessor';

const MONDAY = new Date('2025-01-27');

function contract(
  id: string,
  moraleLevel: AtBMoraleLevel | undefined,
): IContract {
  return {
    id,
    name: `Contract ${id}`,
    status: MissionStatus.ACTIVE,
    type: 'contract',
    systemId: 'test-system',
    scenarioIds: [],
    description: 'Test contract',
    briefing: 'Test briefing',
    startDate: '3025-01-01',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    employerId: 'davion',
    targetId: 'liao',
    paymentTerms: {
      basePayment: new Money(100000),
      successPayment: new Money(0),
      partialPayment: new Money(0),
      failurePayment: new Money(0),
      salvagePercent: 50,
      transportPayment: new Money(0),
      supportPayment: new Money(0),
    },
    salvageRights: 'Integrated',
    commandRights: 'Independent',
    ...(moraleLevel !== undefined ? { moraleLevel } : {}),
  };
}

function campaignWith(
  contracts: readonly IContract[],
  role: CombatRole = CombatRole.MANEUVER,
): ICampaign {
  const team: ICombatTeam = { forceId: 'force-001', role, battleChance: 40 };
  return {
    id: 'campaign-test',
    name: 'Test Campaign',
    currentDate: MONDAY,
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'force-root',
    missions: new Map(contracts.map((c) => [c.id, c])),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    combatTeams: [team],
    options: {
      ...createDefaultCampaignOptions(),
      useAtBScenarios: true,
      difficultyMultiplier: 1.0,
    },
    campaignType: CampaignType.MERCENARY,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    unitCombatStates: {},
  };
}

/** The first draw is the battle roll, the second is the scenario-type roll; later draws are 0.5. */
function rolls(battle: number, scenarioType: number) {
  let calls = 0;
  return () => {
    calls += 1;
    if (calls === 1) return battle;
    if (calls === 2) return scenarioType;
    return 0.5;
  };
}

/** One team, one contract per call; battle roll 0 always hits. */
function generated(
  level: AtBMoraleLevel | undefined,
  role = CombatRole.MANEUVER,
  scenarioTypeRoll = 0.5,
) {
  const processor = createScenarioGenerationProcessor(
    rolls(0, scenarioTypeRoll),
  );
  return processor.process(campaignWith([contract('c1', level)], role), MONDAY)
    .events;
}

describe('F1: a ROUTED contract generates no scenarios (pin StratConRulesManager.java:4492-4495)', () => {
  it('generates nothing for a ROUTED contract even when the battle roll hits', () => {
    expect(generated(AtBMoraleLevel.ROUTED)).toHaveLength(0);
  });

  it.each([
    AtBMoraleLevel.CRITICAL,
    AtBMoraleLevel.WEAKENED,
    AtBMoraleLevel.STALEMATE,
    AtBMoraleLevel.ADVANCING,
    AtBMoraleLevel.DOMINATING,
    AtBMoraleLevel.OVERWHELMING,
  ])('still generates a scenario for a %s contract', (level) => {
    const events = generated(level);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('scenario_generated');
  });

  it('still generates for a contract with no recorded level (STALEMATE)', () => {
    expect(generated(undefined)).toHaveLength(1);
  });

  it('skips only the routed contract: another active contract still generates', () => {
    const processor = createScenarioGenerationProcessor(() => 0);
    const events = processor.process(
      campaignWith([
        contract('routed', AtBMoraleLevel.ROUTED),
        contract('steady', AtBMoraleLevel.STALEMATE),
      ]),
      MONDAY,
    ).events;
    expect(events.map((e) => e.data?.contractId)).toEqual(['steady']);
  });

  it('does not touch the campaign when the only contract is routed', () => {
    const processor = createScenarioGenerationProcessor(() => 0);
    const campaign = campaignWith([contract('routed', AtBMoraleLevel.ROUTED)]);
    expect(processor.process(campaign, MONDAY).campaign).toBe(campaign);
  });
});

describe('F2: morale does not change the scenario-type mix (pin CampaignNewDayManager.java:2292-2293)', () => {
  const TABLES: ReadonlyArray<
    readonly [
      CombatRole,
      number,
      (roll: number) => { scenarioType: string; isAttacker: boolean },
    ]
  > = [
    [CombatRole.MANEUVER, 40, selectManeuverScenario],
    [CombatRole.PATROL, 60, selectPatrolScenario],
    [CombatRole.FRONTLINE, 20, selectFrontlineScenario],
    [CombatRole.TRAINING, 10, selectTrainingScenario],
  ];
  const NOT_ROUTED = Object.values(AtBMoraleLevel).filter(
    (level) => level !== AtBMoraleLevel.ROUTED,
  );

  it.each(TABLES)(
    'every non-routed level draws %s scenarios from the same table row as STALEMATE (base roll + 1), for every base roll',
    (role, max, table) => {
      for (let base = 1; base <= max; base++) {
        const expected = table(base + 1);
        for (const level of NOT_ROUTED) {
          const [event] = generated(level, role, (base - 0.5) / max);
          expect([
            level,
            base,
            event.data?.scenarioType,
            event.data?.isAttacker,
          ]).toEqual([level, base, expected.scenarioType, expected.isAttacker]);
        }
      }
    },
  );

  it('selectScenarioType takes the role and a random source only', () => {
    expect(selectScenarioType.length).toBe(2);
    // A morale level is no longer an argument: this must stay a compile error.
    const compileTimeOnly = () =>
      // @ts-expect-error morale is not an argument of selectScenarioType
      selectScenarioType(CombatRole.MANEUVER, AtBMoraleLevel.ROUTED, () => 0.5);
    void compileTimeOnly;
  });

  it('keeps the fixed +1 offset every run has used, with a result frozen like the tables', () => {
    const result = selectScenarioType(CombatRole.MANEUVER, () => 0); // base roll 1
    expect(result).toEqual(selectManeuverScenario(2));
    expect(Object.isFrozen(result)).toBe(true);
  });
});
