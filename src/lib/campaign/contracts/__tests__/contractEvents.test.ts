import {
  ContractEventType,
  BetrayalSubType,
  checkMonthlyEvents,
  getAllEventTypes,
  getAllBetrayalSubTypes,
  EVENT_CHECK_CHANCE,
  type RandomFn,
} from '../contractEvents';

// =============================================================================
// Test Helpers
// =============================================================================

function fixedRandom(value: number): RandomFn {
  return () => value;
}

function createSequenceRandom(values: number[]): RandomFn {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index++;
    return value;
  };
}

function createSeededRandom(seed: number): RandomFn {
  let state = seed;
  return () => {
    state = (1103515245 * state + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// =============================================================================
// ContractEventType Enum Tests
// =============================================================================

describe('ContractEventType enum', () => {
  it('should have exactly 10 event types', () => {
    const types = Object.values(ContractEventType);
    expect(types).toHaveLength(10);
  });

  it('should contain all expected event type values', () => {
    expect(ContractEventType.BONUS_ROLL).toBe('bonus_roll');
    expect(ContractEventType.SPECIAL_SCENARIO).toBe('special_scenario');
    expect(ContractEventType.CIVIL_DISTURBANCE).toBe('civil_disturbance');
    expect(ContractEventType.REBELLION).toBe('rebellion');
    expect(ContractEventType.BETRAYAL).toBe('betrayal');
    expect(ContractEventType.TREACHERY).toBe('treachery');
    expect(ContractEventType.LOGISTICS_FAILURE).toBe('logistics_failure');
    expect(ContractEventType.REINFORCEMENTS).toBe('reinforcements');
    expect(ContractEventType.SPECIAL_EVENTS).toBe('special_events');
    expect(ContractEventType.BIG_BATTLE).toBe('big_battle');
  });
});

// =============================================================================
// BetrayalSubType Enum Tests
// =============================================================================

describe('BetrayalSubType enum', () => {
  it('should have exactly 6 betrayal sub-types', () => {
    const subTypes = Object.values(BetrayalSubType);
    expect(subTypes).toHaveLength(6);
  });

  it('should contain all expected betrayal sub-type values', () => {
    expect(BetrayalSubType.SUPPLY_CUTOFF).toBe('supply_cutoff');
    expect(BetrayalSubType.FALSE_INTEL).toBe('false_intel');
    expect(BetrayalSubType.REDIRECT_REINFORCEMENTS).toBe(
      'redirect_reinforcements',
    );
    expect(BetrayalSubType.POSITION_LEAKED).toBe('position_leaked');
    expect(BetrayalSubType.AMBUSH_SETUP).toBe('ambush_setup');
    expect(BetrayalSubType.CONTRACT_BREACH).toBe('contract_breach');
  });
});

// =============================================================================
// checkMonthlyEvents Tests
// =============================================================================

describe('checkMonthlyEvents', () => {
  it('should return empty array when no events triggered', () => {
    const random = fixedRandom(0.99); // Always above 5%
    const events = checkMonthlyEvents(random);
    expect(events).toEqual([]);
  });

  it('should return events when triggered', () => {
    const random = createSequenceRandom([0.01, 0.99]); // First < 5%, rest >= 5%
    const events = checkMonthlyEvents(random);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toHaveProperty('type');
    expect(events[0]).toHaveProperty('description');
    expect(events[0]).toHaveProperty('effects');
  });

  it('should allow multiple events to occur in same month', () => {
    const random = fixedRandom(0.01); // Always below 5%
    const events = checkMonthlyEvents(random);
    expect(events).toHaveLength(10); // All 10 event types should trigger
  });

  it('should have valid event structure', () => {
    const random = fixedRandom(0.01);
    const events = checkMonthlyEvents(random);

    for (const event of events) {
      expect(event).toHaveProperty('type');
      expect(Object.values(ContractEventType)).toContain(event.type);
      expect(event).toHaveProperty('description');
      expect(typeof event.description).toBe('string');
      expect(event).toHaveProperty('effects');
      expect(Array.isArray(event.effects)).toBe(true);
      expect(event.effects.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// Event Effects by Type Tests
// =============================================================================

describe('Event effects by type', () => {
  it('CIVIL_DISTURBANCE should have morale_change +1', () => {
    const random = fixedRandom(0.01);
    const events = checkMonthlyEvents(random);
    const civilEvent = events.find(
      (e) => e.type === ContractEventType.CIVIL_DISTURBANCE,
    );

    expect(civilEvent).toBeDefined();
    const moraleEffect = civilEvent!.effects.find(
      (e) => e.type === 'morale_change',
    );
    expect(moraleEffect).toBeDefined();
    expect(moraleEffect).toEqual({ type: 'morale_change', value: 1 });
  });

  it('LOGISTICS_FAILURE should have parts_modifier -1', () => {
    const random = fixedRandom(0.01);
    const events = checkMonthlyEvents(random);
    const logisticsEvent = events.find(
      (e) => e.type === ContractEventType.LOGISTICS_FAILURE,
    );

    expect(logisticsEvent).toBeDefined();
    const partsEffect = logisticsEvent!.effects.find(
      (e) => e.type === 'parts_modifier',
    );
    expect(partsEffect).toBeDefined();
    expect(partsEffect).toEqual({ type: 'parts_modifier', value: -1 });
  });

  it('REINFORCEMENTS should have morale_change -1', () => {
    const random = fixedRandom(0.01);
    const events = checkMonthlyEvents(random);
    const reinforcementsEvent = events.find(
      (e) => e.type === ContractEventType.REINFORCEMENTS,
    );

    expect(reinforcementsEvent).toBeDefined();
    const moraleEffect = reinforcementsEvent!.effects.find(
      (e) => e.type === 'morale_change',
    );
    expect(moraleEffect).toBeDefined();
    expect(moraleEffect).toEqual({ type: 'morale_change', value: -1 });
  });

  it('BONUS_ROLL should have payment_modifier 1.1', () => {
    const random = fixedRandom(0.01);
    const events = checkMonthlyEvents(random);
    const bonusEvent = events.find(
      (e) => e.type === ContractEventType.BONUS_ROLL,
    );

    expect(bonusEvent).toBeDefined();
    const paymentEffect = bonusEvent!.effects.find(
      (e) => e.type === 'payment_modifier',
    );
    expect(paymentEffect).toBeDefined();
    expect(paymentEffect).toEqual({
      type: 'payment_modifier',
      multiplier: 1.1,
    });
  });

  it('SPECIAL_SCENARIO should have scenario_trigger', () => {
    const random = fixedRandom(0.01);
    const events = checkMonthlyEvents(random);
    const specialEvent = events.find(
      (e) => e.type === ContractEventType.SPECIAL_SCENARIO,
    );

    expect(specialEvent).toBeDefined();
    const scenarioEffect = specialEvent!.effects.find(
      (e) => e.type === 'scenario_trigger',
    );
    expect(scenarioEffect).toBeDefined();
    expect(scenarioEffect).toEqual({
      type: 'scenario_trigger',
      scenarioType: 'special_mission',
    });
  });

  it('REBELLION should have both morale_change and scenario_trigger', () => {
    const random = fixedRandom(0.01);
    const events = checkMonthlyEvents(random);
    const rebellionEvent = events.find(
      (e) => e.type === ContractEventType.REBELLION,
    );

    expect(rebellionEvent).toBeDefined();
    expect(rebellionEvent!.effects).toHaveLength(2);

    const moraleEffect = rebellionEvent!.effects.find(
      (e) => e.type === 'morale_change',
    );
    expect(moraleEffect).toEqual({ type: 'morale_change', value: 2 });

    const scenarioEffect = rebellionEvent!.effects.find(
      (e) => e.type === 'scenario_trigger',
    );
    expect(scenarioEffect).toEqual({
      type: 'scenario_trigger',
      scenarioType: 'rebellion_battle',
    });
  });

  it('TREACHERY should have both morale_change and scenario_trigger', () => {
    const random = fixedRandom(0.01);
    const events = checkMonthlyEvents(random);
    const treacheryEvent = events.find(
      (e) => e.type === ContractEventType.TREACHERY,
    );

    expect(treacheryEvent).toBeDefined();
    expect(treacheryEvent!.effects).toHaveLength(2);

    const moraleEffect = treacheryEvent!.effects.find(
      (e) => e.type === 'morale_change',
    );
    expect(moraleEffect).toEqual({ type: 'morale_change', value: 1 });

    const scenarioEffect = treacheryEvent!.effects.find(
      (e) => e.type === 'scenario_trigger',
    );
    expect(scenarioEffect).toEqual({
      type: 'scenario_trigger',
      scenarioType: 'ambush',
    });
  });

  it('BIG_BATTLE should have scenario_trigger with big_battle', () => {
    const random = fixedRandom(0.01);
    const events = checkMonthlyEvents(random);
    const bigBattleEvent = events.find(
      (e) => e.type === ContractEventType.BIG_BATTLE,
    );

    expect(bigBattleEvent).toBeDefined();
    const scenarioEffect = bigBattleEvent!.effects.find(
      (e) => e.type === 'scenario_trigger',
    );
    expect(scenarioEffect).toBeDefined();
    expect(scenarioEffect).toEqual({
      type: 'scenario_trigger',
      scenarioType: 'big_battle',
    });
  });
});

// =============================================================================
// Betrayal Event Tests
// =============================================================================

describe('Betrayal events', () => {
  it('BETRAYAL should have betrayalSubType field set', () => {
    const random = fixedRandom(0.01);
    const events = checkMonthlyEvents(random);
    const betrayalEvent = events.find(
      (e) => e.type === ContractEventType.BETRAYAL,
    );

    expect(betrayalEvent).toBeDefined();
    expect(betrayalEvent!.betrayalSubType).toBeDefined();
    expect(Object.values(BetrayalSubType)).toContain(
      betrayalEvent!.betrayalSubType,
    );
  });

  it('SUPPLY_CUTOFF should have parts_modifier -2', () => {
    let found = false;
    for (let seed = 0; seed < 5000; seed++) {
      const random = createSeededRandom(seed);
      const events = checkMonthlyEvents(random);
      const betrayalEvent = events.find(
        (e) => e.type === ContractEventType.BETRAYAL,
      );

      if (betrayalEvent?.betrayalSubType === BetrayalSubType.SUPPLY_CUTOFF) {
        const partsEffect = betrayalEvent.effects.find(
          (e) => e.type === 'parts_modifier',
        );
        expect(partsEffect).toEqual({ type: 'parts_modifier', value: -2 });
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('CONTRACT_BREACH should have payment_modifier 0.5', () => {
    let found = false;
    for (let seed = 0; seed < 5000; seed++) {
      const random = createSeededRandom(seed);
      const events = checkMonthlyEvents(random);
      const betrayalEvent = events.find(
        (e) => e.type === ContractEventType.BETRAYAL,
      );

      if (betrayalEvent?.betrayalSubType === BetrayalSubType.CONTRACT_BREACH) {
        const paymentEffect = betrayalEvent.effects.find(
          (e) => e.type === 'payment_modifier',
        );
        expect(paymentEffect).toEqual({
          type: 'payment_modifier',
          multiplier: 0.5,
        });
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('POSITION_LEAKED should have both scenario_trigger and morale_change', () => {
    let found = false;
    for (let seed = 0; seed < 200; seed++) {
      const random = createSeededRandom(seed);
      const events = checkMonthlyEvents(random);
      const betrayalEvent = events.find(
        (e) => e.type === ContractEventType.BETRAYAL,
      );

      if (betrayalEvent?.betrayalSubType === BetrayalSubType.POSITION_LEAKED) {
        expect(betrayalEvent.effects).toHaveLength(2);

        const scenarioEffect = betrayalEvent.effects.find(
          (e) => e.type === 'scenario_trigger',
        );
        expect(scenarioEffect).toEqual({
          type: 'scenario_trigger',
          scenarioType: 'ambush',
        });

        const moraleEffect = betrayalEvent.effects.find(
          (e) => e.type === 'morale_change',
        );
        expect(moraleEffect).toEqual({ type: 'morale_change', value: 1 });

        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('should have 6 different betrayal sub-types with different effects', () => {
    const subTypesFound = new Set<BetrayalSubType>();

    for (let seed = 0; seed < 1000; seed++) {
      const random = createSeededRandom(seed);
      const events = checkMonthlyEvents(random);
      const betrayalEvent = events.find(
        (e) => e.type === ContractEventType.BETRAYAL,
      );

      if (betrayalEvent?.betrayalSubType) {
        subTypesFound.add(betrayalEvent.betrayalSubType);
      }
    }

    expect(subTypesFound.size).toBe(6);
  });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('getAllEventTypes', () => {
  it('should return 10 event types', () => {
    const types = getAllEventTypes();
    expect(types).toHaveLength(10);
  });

  it('should return all ContractEventType values', () => {
    const types = getAllEventTypes();
    expect(types).toContain(ContractEventType.BONUS_ROLL);
    expect(types).toContain(ContractEventType.SPECIAL_SCENARIO);
    expect(types).toContain(ContractEventType.CIVIL_DISTURBANCE);
    expect(types).toContain(ContractEventType.REBELLION);
    expect(types).toContain(ContractEventType.BETRAYAL);
    expect(types).toContain(ContractEventType.TREACHERY);
    expect(types).toContain(ContractEventType.LOGISTICS_FAILURE);
    expect(types).toContain(ContractEventType.REINFORCEMENTS);
    expect(types).toContain(ContractEventType.SPECIAL_EVENTS);
    expect(types).toContain(ContractEventType.BIG_BATTLE);
  });
});

describe('getAllBetrayalSubTypes', () => {
  it('should return 6 betrayal sub-types', () => {
    const subTypes = getAllBetrayalSubTypes();
    expect(subTypes).toHaveLength(6);
  });

  it('should return all BetrayalSubType values', () => {
    const subTypes = getAllBetrayalSubTypes();
    expect(subTypes).toContain(BetrayalSubType.SUPPLY_CUTOFF);
    expect(subTypes).toContain(BetrayalSubType.FALSE_INTEL);
    expect(subTypes).toContain(BetrayalSubType.REDIRECT_REINFORCEMENTS);
    expect(subTypes).toContain(BetrayalSubType.POSITION_LEAKED);
    expect(subTypes).toContain(BetrayalSubType.AMBUSH_SETUP);
    expect(subTypes).toContain(BetrayalSubType.CONTRACT_BREACH);
  });
});

// =============================================================================
// Constants Tests
// =============================================================================

describe('EVENT_CHECK_CHANCE constant', () => {
  it('should be 0.05 (5%)', () => {
    expect(EVENT_CHECK_CHANCE).toBe(0.05);
  });
});
