import {
  fs,
  path,
  EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_EVIDENCE,
  EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
  CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT,
  OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
  CRITICAL_COMPONENT_COMBAT_SUPPORT,
  EQUIPMENT_CRITICAL_COMPONENT_EVIDENCE,
  supportIdsByLevel,
  supportIdsMissingSourceRefs,
  uniqueBattleMechFuelOrIncendiaryCriticalSlotNames,
} from './combatCriticalSlotHydrationCatalog.test-helpers';

describe('BattleMech critical-slot hydration support catalog', () => {
  it('keeps fuel and incendiary critical-slot scope grounded in active BattleMech data', () => {
    const miscellaneousEquipment = JSON.parse(
      fs.readFileSync(
        path.join(
          process.cwd(),
          'public',
          'data',
          'equipment',
          'official',
          'miscellaneous',
          'other.json',
        ),
        'utf8',
      ),
    ) as {
      items: readonly {
        id: string;
        name: string;
        rulesLevel: string;
      }[];
    };
    const equipmentNameMappings = JSON.parse(
      fs.readFileSync(
        path.join(
          process.cwd(),
          'public',
          'data',
          'equipment',
          'name-mappings.json',
        ),
        'utf8',
      ),
    ) as Record<string, string>;
    const genericFuelTank = miscellaneousEquipment.items.find(
      (item) => item.id === 'bafueltank',
    );

    expect(genericFuelTank).toMatchObject({
      id: 'bafueltank',
      name: 'Fuel Tank',
      rulesLevel: 'UNOFFICIAL',
    });
    expect(equipmentNameMappings['Extended Fuel Tank']).toBe(
      'extended-fuel-tank',
    );
    expect(equipmentNameMappings['Fuel Tank']).toBe('bafueltank');
    expect(uniqueBattleMechFuelOrIncendiaryCriticalSlotNames()).toEqual([
      'Extended Fuel Tank',
      'Extended Fuel Tank (1 ton)',
      'Extended Fuel Tank (3 tons)',
      'LAM Fuel Tank',
    ]);
  });

  it('keeps represented equipment component slices from promoting the aggregate damage row', () => {
    const aggregateEquipmentComponent =
      CRITICAL_COMPONENT_COMBAT_SUPPORT.equipment;

    expect(
      supportIdsMissingSourceRefs(CRITICAL_COMPONENT_COMBAT_SUPPORT),
    ).toEqual([]);
    expect(
      supportIdsByLevel(CRITICAL_COMPONENT_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      supportIdsByLevel(CRITICAL_COMPONENT_COMBAT_SUPPORT, 'unsupported'),
    ).toEqual([...UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS].sort());
    expect(
      Object.keys(CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT)
        .filter((id) => id.startsWith('equipment-'))
        .sort(),
    ).toEqual(
      [
        ...OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
        ...REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
        ...UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
      ].sort(),
    );
    expect(
      Object.keys(CRITICAL_COMPONENT_COMBAT_SUPPORT)
        .filter((id) => id.startsWith('equipment-'))
        .sort(),
    ).toEqual(
      [
        ...OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
        ...REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
        ...UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS,
      ].sort(),
    );
    expect(aggregateEquipmentComponent).toMatchObject({
      level: 'integrated',
      evidence: EQUIPMENT_CRITICAL_COMPONENT_EVIDENCE,
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('applyEquipmentCritical'),
        }),
      ]),
    });
    expect(aggregateEquipmentComponent.evidence).toContain('split-accounted');
    expect(aggregateEquipmentComponent.evidence).toContain(
      'explicit out-of-scope rows',
    );
    expect(aggregateEquipmentComponent.gap).toBeUndefined();
    expect(aggregateEquipmentComponent.sourceRefs).toEqual(
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
      CRITICAL_COMPONENT_COMBAT_SUPPORT[
        'equipment-generic-destroyed-name-replay'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('destroyedEquipment'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('applyEquipmentCritical'),
        }),
      ]),
    });
    expect(
      CRITICAL_COMPONENT_COMBAT_SUPPORT[
        'equipment-ammo-exhaustion-no-explosion'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('empty tracked bins'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('exact ammo bins'),
        }),
      ]),
    });
    expect(
      CRITICAL_COMPONENT_COMBAT_SUPPORT['equipment-physical-modifiers'],
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
      CRITICAL_COMPONENT_COMBAT_SUPPORT['equipment-partial-wing'],
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
      CRITICAL_COMPONENT_COMBAT_SUPPORT['equipment-active-probe'],
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
      CRITICAL_COMPONENT_COMBAT_SUPPORT['equipment-stealth-linked-ecm'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('electronic-warfare ECM suites'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('active own-ECM state'),
        }),
      ]),
    });
    expect(
      CRITICAL_COMPONENT_COMBAT_SUPPORT['equipment-shields'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('EquipmentHit'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('shield mounts functional'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('destroyedEquipment'),
        }),
      ]),
    });
    expect(CRITICAL_COMPONENT_COMBAT_SUPPORT['equipment-scm']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('sixth SCM critical'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('Super-Cooled Myomer'),
        }),
      ]),
    });
    expect(
      CRITICAL_COMPONENT_COMBAT_SUPPORT['equipment-ac-playtest'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('first-hit state'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('first PLAYTEST_3 autocannon'),
        }),
      ]),
    });
    expect(CRITICAL_COMPONENT_COMBAT_SUPPORT['equipment-harjel']).toMatchObject(
      {
        level: 'integrated',
        evidence: expect.stringContaining('breached location'),
        sourceRefs: expect.arrayContaining([
          expect.objectContaining({
            citation: expect.stringContaining('HarJel II/III'),
          }),
        ]),
      },
    );
    expect(
      CRITICAL_COMPONENT_COMBAT_SUPPORT['equipment-explosive-equipment'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('explicit positive explosionDamage'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('MtfFile maps catalog equipment'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('without ammo-bin fallback fields'),
        }),
      ]),
    });
    expect(
      CRITICAL_COMPONENT_COMBAT_SUPPORT['equipment-charged-capacitors'],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('PPC Capacitor'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('getExplosionDamage'),
        }),
      ]),
    });
    expect(
      CRITICAL_COMPONENT_COMBAT_SUPPORT[
        'equipment-prototype-improved-jump-jet-explosion'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('10-point equipment explosion'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('Prototype Improved Jump Jet'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('getExplosionDamage returns 10'),
        }),
      ]),
    });
    expect(
      CRITICAL_COMPONENT_COMBAT_SUPPORT[
        'equipment-extended-fuel-tank-explosion'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('20-point secondary-effect-gated'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('Extended Fuel Tank'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('getExplosionDamage returns 20'),
        }),
      ]),
    });
    expect(
      CRITICAL_COMPONENT_COMBAT_SUPPORT[
        'equipment-artemis-fcs-critical-lifecycle'
      ],
    ).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('guidance flags'),
      sourceRefs: expect.arrayContaining([
        expect.objectContaining({
          citation: expect.stringContaining('MtfFile maps catalog equipment'),
        }),
        expect.objectContaining({
          citation: expect.stringContaining('destroyedArtemisFcs'),
        }),
      ]),
    });
    expect(
      CRITICAL_COMPONENT_COMBAT_SUPPORT['equipment-bomb-bays'],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_EVIDENCE,
      gap: EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
    });
    expect(
      CRITICAL_COMPONENT_COMBAT_SUPPORT['equipment-blue-shield-special-rules'],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('Blue Shield'),
      gap: expect.stringContaining(
        'outside the BattleMech damage/death critical-effect inventory',
      ),
    });
    expect(
      CRITICAL_COMPONENT_COMBAT_SUPPORT['equipment-fuel-incendiary-branches'],
    ).toMatchObject({
      level: 'out-of-scope',
      evidence: expect.stringContaining('generic Fuel Tank maps'),
      gap: expect.stringContaining('ammo-special validation lanes'),
    });
    for (const id of UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS) {
      expect(CRITICAL_COMPONENT_COMBAT_SUPPORT[id]).toMatchObject({
        level: 'unsupported',
        gap: expect.any(String),
        sourceRefs: expect.arrayContaining([
          expect.objectContaining({
            citation: expect.stringContaining('MtfFile maps catalog equipment'),
          }),
          expect.objectContaining({
            citation: expect.stringContaining('applyEquipmentCritical'),
          }),
        ]),
      });
    }
  });
});
