import {
  ActuatorType,
  DEFAULT_COMPONENT_DAMAGE,
  makeInput,
  canMeleeWeapon,
  type IComponentDamageState,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('canMeleeWeapon', () => {
    it('should allow melee with intact arm', () => {
      expect(canMeleeWeapon(makeInput({ attackType: 'hatchet' })).allowed).toBe(
        true,
      );
    });

    it('should disallow if lower arm destroyed', () => {
      const result = canMeleeWeapon(
        makeInput({
          attackType: 'hatchet',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.LOWER_ARM]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
    });

    it('should disallow if hand destroyed', () => {
      const result = canMeleeWeapon(
        makeInput({
          attackType: 'sword',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.HAND]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
    });

    it('should disallow if arm fired weapon', () => {
      const result = canMeleeWeapon(
        makeInput({ attackType: 'hatchet', weaponsFiredFromArm: ['ppc-1'] }),
      );
      expect(result.allowed).toBe(false);
    });

    it('disallows arm-mounted melee weapons when No Arms quirk is present', () => {
      const result = canMeleeWeapon(
        makeInput({ attackType: 'hatchet', unitQuirks: ['no_arms'] }),
      );

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'NoArmsQuirk',
      });
    });

    it('disallows retractable blade attacks when the blade is not extended', () => {
      const result = canMeleeWeapon(
        makeInput({
          attackType: 'retractable-blade',
          retractableBladeExtended: false,
        }),
      );

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'RetractableBladeNotExtended',
      });
    });

    it('allows flails and lances without a working hand actuator', () => {
      const componentDamage = {
        ...DEFAULT_COMPONENT_DAMAGE,
        actuators: { [ActuatorType.HAND]: true },
      };

      expect(
        canMeleeWeapon(makeInput({ attackType: 'flail', componentDamage }))
          .allowed,
      ).toBe(true);
      expect(
        canMeleeWeapon(makeInput({ attackType: 'lance', componentDamage }))
          .allowed,
      ).toBe(true);
    });

    it('treats wrecking balls as torso-mounted physical weapons', () => {
      const result = canMeleeWeapon(
        makeInput({
          attackType: 'wrecking-ball',
          unitQuirks: ['no_arms'],
          weaponsFiredFromArm: ['right-arm-ppc'],
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: {
              [ActuatorType.SHOULDER]: true,
              [ActuatorType.LOWER_ARM]: true,
              [ActuatorType.HAND]: true,
            },
          },
        }),
      );

      expect(result.allowed).toBe(true);
    });

    it('gates arm-mounted melee weapons against the selected arm location', () => {
      const rightLowerArmDestroyed: IComponentDamageState = {
        ...DEFAULT_COMPONENT_DAMAGE,
        actuatorsByLocation: {
          right_arm: { [ActuatorType.LOWER_ARM]: true },
        },
      };

      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            limb: 'leftArm',
            componentDamage: rightLowerArmDestroyed,
          }),
        ).allowed,
      ).toBe(true);
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            limb: 'rightArm',
            componentDamage: rightLowerArmDestroyed,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'MissingActuator',
      });
    });

    it('gates arm-mounted melee weapons against the selected missing arm', () => {
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'hatchet',
            limb: 'rightArm',
            attackerDestroyedLocations: ['left_arm'],
          }),
        ).allowed,
      ).toBe(true);
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'hatchet',
            limb: 'leftArm',
            attackerDestroyedLocations: ['left_arm'],
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'LimbMissing',
      });
    });

    it('disallows flails but allows wrecking balls on quad BattleMechs', () => {
      expect(
        canMeleeWeapon(
          makeInput({ attackType: 'flail', attackerIsQuad: true }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerQuad',
      });
      expect(
        canMeleeWeapon(
          makeInput({ attackType: 'wrecking-ball', attackerIsQuad: true }),
        ).allowed,
      ).toBe(true);
    });
  });
});
