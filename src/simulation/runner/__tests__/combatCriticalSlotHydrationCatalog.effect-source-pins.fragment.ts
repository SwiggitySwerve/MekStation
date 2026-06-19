import {
  EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_EVIDENCE,
  EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
  CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT,
  EQUIPMENT_CRITICAL_EFFECT_EVIDENCE,
  OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_BRANCHES,
  OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_BRANCHES,
  REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_BRANCHES,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT,
  supportIdsMissingSourceRefs,
} from './combatCriticalSlotHydrationCatalog.test-helpers';

describe('BattleMech critical-slot hydration support catalog', () => {
  it('source-pins critical slot rows and preserves generic equipment lifecycle gaps', () => {
    const aggregateEquipmentEffect =
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT.equipment;

    expect(
      supportIdsMissingSourceRefs(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT),
    ).toEqual([]);
    expect(
      supportIdsMissingSourceRefs(CRITICAL_SLOT_HYDRATION_COMBAT_SUPPORT),
    ).toEqual([]);
    expect(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT.equipment).toMatchObject({
      level: 'integrated',
      evidence: EQUIPMENT_CRITICAL_EFFECT_EVIDENCE,
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('applyEquipmentCritical'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining(
            'otherwise-unclassified equipment slots to EquipmentDestroyed',
          ),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('CASE plus unresolved'),
        }),
      ]),
    });
    expect(aggregateEquipmentEffect.evidence).toContain('split-accounted');
    expect(aggregateEquipmentEffect.evidence).toContain(
      'explicit out-of-scope rows',
    );
    expect(aggregateEquipmentEffect.gap).toBeUndefined();
    expect(aggregateEquipmentEffect.sourceRefs).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('getPartialWingJumpBonus'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('hasClaw'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('hasTalons'),
        }),
      ]),
    );
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT[
        'equipment-generic-destroyed-name-replay'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('destroyedEquipment'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('applyEquipmentCritical'),
        }),
        expect.objectContaining({
          kind: 'mekstation-deviation',
          citation: expect.stringContaining('destroyedEquipment'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT['equipment-physical-modifiers'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Claw/Talons'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('hasClaw'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('hasTalons'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT['equipment-partial-wing'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('partialWingJumpBonus'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('getPartialWingJumpBonus'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT['equipment-active-probe'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('active probes non-operational'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('active-probe equipment'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT['equipment-stealth-linked-ecm'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('ECM suites non-operational'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('active own-ECM state'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT['equipment-shields'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('preserves shield function'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('shield mounts functional'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('destroyedEquipment'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT['equipment-shields'].evidence,
    ).toContain('without explicit explosionDamage');
    expect(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT['equipment-scm']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('sixth SCM critical'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('Super-Cooled Myomer'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT['equipment-emergency-coolant'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('damaged-coolant-system state'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining(
            'emergency coolant systems damaged',
          ),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('5 damage'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT['equipment-ac-playtest'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('first-hit autocannon state'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('first PLAYTEST_3 autocannon'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT['equipment-harjel'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('breached-location state'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('HarJel II/III'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT['equipment-explosive-equipment'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('explicit positive explosionDamage'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('explosionDamage payloads'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT['equipment-charged-capacitors'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('PPC Capacitor'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('hasChargedCapacitor'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT['equipment-blue-shield-explosion'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Blue Shield'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('5 damage'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('mode is Off'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT[
        'equipment-prototype-improved-jump-jet-explosion'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Prototype Improved Jump Jet'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('10 damage'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT[
        'equipment-extended-fuel-tank-explosion'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('Extended Fuel Tank'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('20 damage'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT[
        'equipment-artemis-fcs-critical-lifecycle'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining(
        'Artemis IV/prototype Artemis IV/Artemis V FCS',
      ),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('F_ARTEMIS'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('guidance'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT[
        'equipment-artemis-fcs-critical-lifecycle'
      ].evidence,
    ).toContain('ambiguous FCS allocation');
    expect([...REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_BRANCHES]).toEqual([
      'Claw/Talons physical critical-event production and modifier cleanup',
      'Partial Wing jump-bonus critical-event replay',
      'stealth-linked ECM suite critical-event replay',
      'active-probe critical-event replay',
      'generic shield preserved-function critical-event replay, including Blue Shield by name only',
      'represented mode-gated official Blue Shield Particle Field Damper 5-point critical explosion replay',
      'SCM six-slot critical lifecycle replay',
      'Emergency Coolant System damaged-state and 5-point critical explosion replay',
      'PLAYTEST_3 autocannon first-hit and follow-up critical replay including official RAC/HVAC names',
      'HarJel breach and HarJel II/III secondary-critical replay',
      'represented explicit explosion-damage equipment critical replay',
      'represented hot-loaded weapon critical explosion replay',
      'represented HotLoad linked-ammo weapon critical hydration with unique linked ammo explosionDamage',
      'represented HotLoad mode-state weapon critical hydration with explicit explosionDamage',
      'represented PPC Capacitor charged-capacitor critical explosion replay',
      'represented Prototype Improved Jump Jet 10-point critical explosion replay',
      'represented Extended Fuel Tank 20-point critical explosion replay',
      'represented RISC Laser Pulse Module exact explicit or unambiguous same-location linked-laser critical replay',
      'represented RISC Laser Pulse Module inoperable-linked module-destruction replay',
      'represented RISC Laser Pulse Module ambiguous or absent linked-laser no-fallback replay',
      'represented Artemis FCS critical-damage guidance removal replay',
      'generic EquipmentDestroyed name replay',
      'empty tracked ammo-bin critical no-explosion branch',
    ]);
    expect([...REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS]).toEqual([
      'equipment-ammo-exhaustion-no-explosion',
      'equipment-generic-destroyed-name-replay',
      'equipment-physical-modifiers',
      'equipment-partial-wing',
      'equipment-active-probe',
      'equipment-emergency-coolant',
      'equipment-ac-playtest',
      'equipment-harjel',
      'equipment-explosive-equipment',
      'equipment-hot-loaded-weapons',
      'equipment-hot-load-linked-ammo-inference',
      'equipment-hot-load-mode-state-inference',
      'equipment-blue-shield-explosion',
      'equipment-charged-capacitors',
      'equipment-prototype-improved-jump-jet-explosion',
      'equipment-extended-fuel-tank-explosion',
      'equipment-risc-laser-pulse-module-linked-laser',
      'equipment-risc-laser-pulse-module-inoperable-linked-module',
      'equipment-risc-laser-pulse-module-ambiguous-link',
      'equipment-artemis-fcs-critical-lifecycle',
      'equipment-shields',
      'equipment-scm',
      'equipment-stealth-linked-ecm',
    ]);
    expect([...OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_BRANCHES]).toEqual([
      'Blue Shield ARAD, hit-location, activation, and defensive special rules beyond damage/death critical replay',
      'bomb bays',
      'LAM/non-BattleMech fuel equipment and incendiary ammo lifecycle branches outside ground BattleMech equipment-critical replay',
    ]);
    expect([...OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS]).toEqual([
      'equipment-blue-shield-special-rules',
      'equipment-bomb-bays',
      'equipment-fuel-incendiary-branches',
    ]);
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT[
        'equipment-blue-shield-special-rules'
      ],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining(
        'not damage/death critical-effect rows',
      ),
      gap: expect.stringContaining(
        'outside the BattleMech damage/death critical-effect inventory',
      ),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('shield mounts functional'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('5 damage'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT['equipment-bomb-bays'],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_EVIDENCE,
      gap: EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('bomb bays'),
        }),
      ]),
    });
    expect(
      CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT['equipment-fuel-incendiary-branches'],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('LAM Fuel Tank'),
      gap: expect.stringContaining('separate LAM/aerospace'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('generic Fuel Tank'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('LAM Fuel Tank'),
        }),
      ]),
    });
    expect([...UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_BRANCHES]).toEqual([]);
    expect([...UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS]).toEqual([]);
    for (const id of UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS) {
      expect(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT[id]).toMatchObject({
        level: 'unsupported',
        gap: expect.any(String),
        sourceRefs: expect.arrayContaining([
          expect.objectContaining({
            citation: expect.stringContaining('applyEquipmentCritical'),
          }),
        ]),
      });
    }
  });
});
