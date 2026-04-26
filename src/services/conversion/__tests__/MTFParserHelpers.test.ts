/**
 * MTFParserHelpers Tests
 *
 * Tier 1 invariant tests for the section parsers: header, weapons,
 * critical slots, quirks, weapon quirks, fluff. These parse free-form MTF
 * line lists into typed structures consumed by `MTFParserService.parse()`.
 *
 * Tests assert the literal contract: required header fields with defaults,
 * weapon name normalization, critical-slot padding to MegaMek slot counts,
 * and the discrete shape of quirk/fluff outputs.
 */

import {
  parseCriticalSlots,
  parseFluff,
  parseHeader,
  parseQuirks,
  parseWeaponQuirks,
  parseWeapons,
} from '../MTFParserHelpers';

describe('MTFParserHelpers', () => {
  // ============================================================================
  // parseHeader() — pulls chassis/model/config/techbase/era/rules/role/source
  // ============================================================================
  describe('parseHeader()', () => {
    it('extracts the standard header fields from a complete MTF top section', () => {
      const lines = [
        'chassis:Atlas',
        'model:AS7-D',
        'Config:Biped',
        'techbase:Inner Sphere',
        'era:2755',
        'rules level:2',
        'mul id:11',
        'role:Juggernaut',
        'source:TRO 3025',
      ];

      const header = parseHeader(lines);

      expect(header.chassis).toBe('Atlas');
      expect(header.model).toBe('AS7-D');
      expect(header.config).toBe('Biped');
      expect(header.techBase).toBe('Inner Sphere');
      expect(header.year).toBe(2755);
      expect(header.rulesLevel).toBe('2');
      expect(header.mulId).toBe(11);
      expect(header.role).toBe('Juggernaut');
      expect(header.source).toBe('TRO 3025');
      expect(header.isOmni).toBe(false);
    });

    it('detects omnimech from the Config field', () => {
      const lines = ['chassis:Timber Wolf', 'Config:Biped Omnimech'];
      const header = parseHeader(lines);
      expect(header.isOmni).toBe(true);
    });

    it('parses Base Chassis Heat Sinks for omnimechs', () => {
      const lines = [
        'chassis:Timber Wolf',
        'Config:Biped Omnimech',
        'Base Chassis Heat Sinks:10',
      ];
      const header = parseHeader(lines);
      expect(header.baseChassisHeatSinks).toBe(10);
    });

    it('defaults missing fields per MegaMek convention', () => {
      const header = parseHeader([]);
      expect(header.chassis).toBe('');
      expect(header.model).toBe('');
      expect(header.config).toBe('Biped');
      expect(header.techBase).toBe('Inner Sphere');
      expect(header.year).toBe(3025);
      expect(header.rulesLevel).toBe('2');
      expect(header.isOmni).toBe(false);
    });

    it('extracts clanname when present', () => {
      const lines = ['chassis:Mad Cat', 'clanname:Timber Wolf'];
      const header = parseHeader(lines);
      expect(header.clanname).toBe('Timber Wolf');
    });
  });

  // ============================================================================
  // parseWeapons() — line-list parser between "Weapons:N" and the next blank
  // ============================================================================
  describe('parseWeapons()', () => {
    it('extracts weapons with normalized id and location', () => {
      const lines = [
        'Weapons:3',
        'Medium Laser, Right Arm',
        'PPC, Left Arm',
        'LRM 20, Center Torso',
        '',
      ];

      const weapons = parseWeapons(lines);

      expect(weapons).toHaveLength(3);
      expect(weapons[0]).toEqual({ id: 'medium-laser', location: 'RIGHT_ARM' });
      expect(weapons[1]).toEqual({ id: 'ppc', location: 'LEFT_ARM' });
      expect(weapons[2]).toEqual({ id: 'lrm-20', location: 'CENTER_TORSO' });
    });

    it('flags omnipod-mounted weapons and strips the suffix from the id', () => {
      const lines = ['Weapons:1', 'Medium Laser (omnipod), Right Arm', ''];
      const weapons = parseWeapons(lines);
      expect(weapons).toHaveLength(1);
      expect(weapons[0]).toEqual({
        id: 'medium-laser',
        location: 'RIGHT_ARM',
        isOmniPodMounted: true,
      });
    });

    it('returns empty array when no Weapons: section present', () => {
      const weapons = parseWeapons(['chassis:Atlas']);
      expect(weapons).toHaveLength(0);
    });

    it('stops at the first blank line after the Weapons: header', () => {
      const lines = [
        'Weapons:2',
        'Medium Laser, Right Arm',
        '',
        'PPC, Left Arm',
      ];
      const weapons = parseWeapons(lines);
      expect(weapons).toHaveLength(1);
      expect(weapons[0].id).toBe('medium-laser');
    });
  });

  // ============================================================================
  // parseCriticalSlots() — returns padded slot lists per location
  // ============================================================================
  describe('parseCriticalSlots()', () => {
    it('returns 12 slots for arms/torsos and 6 for head/legs', () => {
      const lines = [
        'Left Arm:',
        'Shoulder',
        'Upper Arm Actuator',
        'Lower Arm Actuator',
        'Hand Actuator',
        '-Empty-',
        '-Empty-',
        '-Empty-',
        '-Empty-',
        '-Empty-',
        '-Empty-',
        '-Empty-',
        '-Empty-',
        'Head:',
        'Life Support',
        'Sensors',
        'Cockpit',
        '-Empty-',
        'Sensors',
        'Life Support',
      ];

      const slots = parseCriticalSlots(lines);

      expect(slots.LEFT_ARM).toHaveLength(12);
      expect(slots.LEFT_ARM[0]).toBe('Shoulder');
      expect(slots.LEFT_ARM[3]).toBe('Hand Actuator');
      expect(slots.LEFT_ARM[4]).toBeNull();

      expect(slots.HEAD).toHaveLength(6);
      expect(slots.HEAD[0]).toBe('Life Support');
      expect(slots.HEAD[3]).toBeNull();
    });

    it('pads short slot lists with nulls up to the location capacity', () => {
      const lines = ['Right Leg:', 'Hip', 'Upper Leg Actuator'];
      const slots = parseCriticalSlots(lines);
      expect(slots.RIGHT_LEG).toHaveLength(6);
      expect(slots.RIGHT_LEG[2]).toBeNull();
    });

    it('truncates over-long slot lists', () => {
      const filler = Array.from({ length: 20 }, (_, i) => `Item ${i}`);
      const lines = ['Head:', ...filler];
      const slots = parseCriticalSlots(lines);
      expect(slots.HEAD).toHaveLength(6);
    });

    it('handles quad mech leg locations', () => {
      const lines = [
        'Front Left Leg:',
        'Hip',
        'Upper Leg Actuator',
        'Lower Leg Actuator',
        'Foot Actuator',
        '-Empty-',
        '-Empty-',
      ];
      const slots = parseCriticalSlots(lines);
      expect(slots.FRONT_LEFT_LEG).toHaveLength(6);
    });
  });

  // ============================================================================
  // parseQuirks()
  // ============================================================================
  describe('parseQuirks()', () => {
    it('extracts all quirk: lines as a list', () => {
      const lines = [
        'chassis:Atlas',
        'quirk:rugged_1',
        'quirk:command_mech',
        'model:AS7-D',
      ];
      expect(parseQuirks(lines)).toEqual(['rugged_1', 'command_mech']);
    });

    it('returns an empty array when no quirks present', () => {
      expect(parseQuirks(['chassis:Atlas'])).toEqual([]);
    });

    it('skips empty quirk values', () => {
      const lines = ['quirk:rugged_1', 'quirk:', 'quirk:command_mech'];
      expect(parseQuirks(lines)).toEqual(['rugged_1', 'command_mech']);
    });
  });

  // ============================================================================
  // parseWeaponQuirks()
  // ============================================================================
  describe('parseWeaponQuirks()', () => {
    it('groups weapon quirks by weapon name', () => {
      const lines = [
        'weapon_quirk:accurate:Medium Laser',
        'weapon_quirk:improved_cooling:Medium Laser',
        'weapon_quirk:jammable:LRM 20',
      ];
      expect(parseWeaponQuirks(lines)).toEqual({
        'Medium Laser': ['accurate', 'improved_cooling'],
        'LRM 20': ['jammable'],
      });
    });

    it('returns empty object when no weapon_quirk lines present', () => {
      expect(parseWeaponQuirks(['chassis:Atlas'])).toEqual({});
    });

    it('skips malformed weapon_quirk lines (missing weapon name or quirk)', () => {
      const lines = [
        'weapon_quirk:accurate:Medium Laser',
        'weapon_quirk:onlyone',
        'weapon_quirk::Medium Laser',
        'weapon_quirk:accurate:',
      ];
      expect(parseWeaponQuirks(lines)).toEqual({
        'Medium Laser': ['accurate'],
      });
    });
  });

  // ============================================================================
  // parseFluff()
  // ============================================================================
  describe('parseFluff()', () => {
    it('extracts overview/capabilities/deployment/history/manufacturer/primaryfactory', () => {
      const lines = [
        'overview:Heavy assault mech',
        'capabilities:Devastating short range',
        'deployment:House Davion',
        'history:Built in 3025',
        'manufacturer:Defiance',
        'primaryfactory:Hesperus II',
      ];

      const fluff = parseFluff(lines);
      expect(fluff.overview).toBe('Heavy assault mech');
      expect(fluff.capabilities).toBe('Devastating short range');
      expect(fluff.deployment).toBe('House Davion');
      expect(fluff.history).toBe('Built in 3025');
      expect(fluff.manufacturer).toBe('Defiance');
      expect(fluff.primaryFactory).toBe('Hesperus II');
    });

    it('extracts systemmanufacturer entries into a sub-record', () => {
      const lines = [
        'systemmanufacturer:ENGINE:GM 300',
        'systemmanufacturer:ARMOR:Kallon Industries',
      ];
      const fluff = parseFluff(lines);
      expect(fluff.systemManufacturer).toEqual({
        ENGINE: 'GM 300',
        ARMOR: 'Kallon Industries',
      });
    });

    it('returns an empty object when no fluff fields present', () => {
      expect(parseFluff(['chassis:Atlas'])).toEqual({});
    });
  });
});
