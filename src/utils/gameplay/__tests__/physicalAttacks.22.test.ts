import {
  ActuatorType,
  DEFAULT_COMPONENT_DAMAGE,
  makeInput,
  calculatePhysicalToHit,
  type IPhysicalAttackInput,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('calculatePhysicalToHit (dispatch)', () => {
    it('should dispatch punch', () => {
      const result = calculatePhysicalToHit(
        makeInput({ attackType: 'punch', pilotingSkill: 5 }),
      );
      expect(result.baseToHit).toBe(5);
    });

    it('rejects explicit two-handed Zweihander punch declarations without represented prerequisites', () => {
      const valid = calculatePhysicalToHit(
        makeInput({
          attackType: 'punch',
          pilotAbilities: ['zweihander'],
          twoHandedZweihander: true,
        }),
      );
      expect(valid.allowed).toBe(true);

      const cases: readonly [string, Partial<IPhysicalAttackInput>, string][] =
        [
          ['missing SPA', {}, 'RequiredSpaMissing'],
          [
            'prone attacker',
            { pilotAbilities: ['zweihander'], attackerProne: true },
            'AttackerProne',
          ],
          [
            'missing off arm',
            {
              pilotAbilities: ['zweihander'],
              attackerDestroyedLocations: ['left_arm'],
            },
            'LimbMissing',
          ],
          [
            'destroyed represented hand actuator',
            {
              pilotAbilities: ['zweihander'],
              componentDamage: {
                ...DEFAULT_COMPONENT_DAMAGE,
                actuators: { [ActuatorType.HAND]: true },
              },
            },
            'MissingActuator',
          ],
          [
            'missing represented hand actuator',
            { pilotAbilities: ['zweihander'], handActuatorPresent: false },
            'MissingActuator',
          ],
          [
            'arm weapon already fired',
            {
              pilotAbilities: ['zweihander'],
              weaponsFiredFromArm: ['medium-laser'],
            },
            'WeaponFiredThisTurn',
          ],
        ];

      for (const [name, overrides, reasonCode] of cases) {
        const result = calculatePhysicalToHit(
          makeInput({
            attackType: 'punch',
            twoHandedZweihander: true,
            ...overrides,
          }),
        );

        expect(result.allowed).toBe(false);
        expect(result.restrictionReasonCode).toBe(reasonCode);
        expect(result.finalToHit).toBe(Infinity);
      }
    });

    it('applies represented off-arm actuator penalties to two-handed Zweihander punches', () => {
      const result = calculatePhysicalToHit(
        makeInput({
          attackType: 'punch',
          pilotAbilities: ['zweihander'],
          twoHandedZweihander: true,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuatorsByLocation: {
              left_arm: {
                [ActuatorType.UPPER_ARM]: true,
                [ActuatorType.LOWER_ARM]: true,
              },
            },
          },
        }),
      );

      expect(result.allowed).toBe(true);
      expect(result.finalToHit).toBe(9);
      expect(result.modifiers).toEqual(
        expect.arrayContaining([
          {
            name: 'Off-arm upper arm actuator destroyed',
            value: 2,
            source: 'actuator',
          },
          {
            name: 'Off-arm lower arm actuator destroyed',
            value: 2,
            source: 'actuator',
          },
        ]),
      );
    });

    it('rejects represented two-handed Zweihander punches when either hand actuator is destroyed', () => {
      for (const location of ['left_arm', 'right_arm'] as const) {
        const result = calculatePhysicalToHit(
          makeInput({
            attackType: 'punch',
            pilotAbilities: ['zweihander'],
            twoHandedZweihander: true,
            componentDamage: {
              ...DEFAULT_COMPONENT_DAMAGE,
              actuatorsByLocation: {
                [location]: { [ActuatorType.HAND]: true },
              },
            },
          }),
        );

        expect(result.allowed).toBe(false);
        expect(result.restrictionReasonCode).toBe('MissingActuator');
        expect(result.finalToHit).toBe(Infinity);
      }
    });

    it('applies represented two-handed Zweihander physical-weapon gates and off-arm penalties', () => {
      const result = calculatePhysicalToHit(
        makeInput({
          attackType: 'hatchet',
          pilotAbilities: ['zweihander'],
          twoHandedZweihander: true,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuatorsByLocation: {
              left_arm: {
                [ActuatorType.UPPER_ARM]: true,
                [ActuatorType.LOWER_ARM]: true,
              },
            },
          },
        }),
      );

      expect(result.allowed).toBe(true);
      expect(result.finalToHit).toBe(8);
      expect(result.modifiers).toEqual(
        expect.arrayContaining([
          {
            name: 'hatchet modifier',
            value: -1,
            source: 'weapon',
          },
          {
            name: 'Off-arm upper arm actuator destroyed',
            value: 2,
            source: 'actuator',
          },
          {
            name: 'Off-arm lower arm actuator destroyed',
            value: 2,
            source: 'actuator',
          },
        ]),
      );

      const missingSpa = calculatePhysicalToHit(
        makeInput({
          attackType: 'hatchet',
          twoHandedZweihander: true,
        }),
      );
      expect(missingSpa.allowed).toBe(false);
      expect(missingSpa.restrictionReasonCode).toBe('RequiredSpaMissing');

      const firedArm = calculatePhysicalToHit(
        makeInput({
          attackType: 'hatchet',
          pilotAbilities: ['zweihander'],
          twoHandedZweihander: true,
          weaponsFiredFromArm: ['left-medium-laser'],
        }),
      );
      expect(firedArm.allowed).toBe(false);
      expect(firedArm.restrictionReasonCode).toBe('WeaponFiredThisTurn');
    });

    it('should dispatch kick', () => {
      const result = calculatePhysicalToHit(
        makeInput({ attackType: 'kick', pilotingSkill: 5 }),
      );
      expect(result.baseToHit).toBe(3);
    });

    it('should dispatch push', () => {
      const result = calculatePhysicalToHit(
        makeInput({ attackType: 'push', pilotingSkill: 5 }),
      );
      expect(result.baseToHit).toBe(4);
    });

    it('applies source-backed Frogman to every physical to-hit path in depth-2 water', () => {
      const attackTypes = [
        'punch',
        'kick',
        'charge',
        'dfa',
        'push',
        'hatchet',
        'sword',
        'mace',
        'lance',
        'retractable-blade',
        'flail',
        'wrecking-ball',
      ] as const satisfies readonly IPhysicalAttackInput['attackType'][];

      for (const attackType of attackTypes) {
        const result = calculatePhysicalToHit(
          makeInput({
            attackType,
            pilotingSkill: 5,
            pilotAbilities: ['tm_frogman'],
            attackerWaterDepth: 2,
            attackerUnitType: 'BattleMech',
          }),
        );

        expect(result.allowed).toBe(true);
        expect(result.modifiers).toContainEqual(
          expect.objectContaining({
            name: 'Frogman',
            value: -1,
            source: 'spa',
          }),
        );
      }
    });

    it('applies source-backed Environmental Specialist Light to represented physical to-hit paths', () => {
      const attackTypes = [
        'punch',
        'kick',
        'charge',
        'dfa',
        'push',
        'hatchet',
        'sword',
        'mace',
        'lance',
        'retractable-blade',
        'flail',
        'wrecking-ball',
      ] as const satisfies readonly IPhysicalAttackInput['attackType'][];

      for (const attackType of attackTypes) {
        const result = calculatePhysicalToHit(
          makeInput({
            attackType,
            pilotingSkill: 5,
            pilotAbilities: ['env_specialist'],
            designatedEnvironment: 'light',
            environmentalLight: 'moonless',
            targetIlluminated: false,
          }),
        );

        expect(result.allowed).toBe(true);
        expect(result.modifiers).toContainEqual(
          expect.objectContaining({
            name: 'Environmental Specialist (Light)',
            value: -1,
            source: 'spa',
          }),
        );
      }
    });
  });
});
