/**
 * Location Utilities Tests
 *
 * Tests for mech location shorthand conversions.
 */

import { getLocationShorthand, getLocationFullName } from '../locationUtils';

// =============================================================================
// getLocationShorthand Tests
// =============================================================================

describe('getLocationShorthand', () => {
  it('should return correct shorthand for standard biped locations', () => {
    expect(getLocationShorthand('Head')).toBe('HD');
    expect(getLocationShorthand('Center Torso')).toBe('CT');
    expect(getLocationShorthand('Left Torso')).toBe('LT');
    expect(getLocationShorthand('Right Torso')).toBe('RT');
    expect(getLocationShorthand('Left Arm')).toBe('LA');
    expect(getLocationShorthand('Right Arm')).toBe('RA');
    expect(getLocationShorthand('Left Leg')).toBe('LL');
    expect(getLocationShorthand('Right Leg')).toBe('RL');
  });

  it('should return correct shorthand for quad mech locations', () => {
    expect(getLocationShorthand('Front Left Leg')).toBe('FLL');
    expect(getLocationShorthand('Front Right Leg')).toBe('FRL');
    expect(getLocationShorthand('Rear Left Leg')).toBe('RLL');
    expect(getLocationShorthand('Rear Right Leg')).toBe('RRL');
  });

  it('should return original string for unknown locations', () => {
    expect(getLocationShorthand('Unknown Location')).toBe('Unknown Location');
    expect(getLocationShorthand('Custom')).toBe('Custom');
    expect(getLocationShorthand('')).toBe('');
  });
});

// =============================================================================
// getLocationFullName Tests
// =============================================================================

describe('getLocationFullName', () => {
  it('should return correct full name for standard biped shorthands', () => {
    expect(getLocationFullName('HD')).toBe('Head');
    expect(getLocationFullName('CT')).toBe('Center Torso');
    expect(getLocationFullName('LT')).toBe('Left Torso');
    expect(getLocationFullName('RT')).toBe('Right Torso');
    expect(getLocationFullName('LA')).toBe('Left Arm');
    expect(getLocationFullName('RA')).toBe('Right Arm');
    expect(getLocationFullName('LL')).toBe('Left Leg');
    expect(getLocationFullName('RL')).toBe('Right Leg');
  });

  it('should return correct full name for quad mech shorthands', () => {
    expect(getLocationFullName('FLL')).toBe('Front Left Leg');
    expect(getLocationFullName('FRL')).toBe('Front Right Leg');
    expect(getLocationFullName('RLL')).toBe('Rear Left Leg');
    expect(getLocationFullName('RRL')).toBe('Rear Right Leg');
  });

  it('should return original string for unknown shorthands', () => {
    expect(getLocationFullName('XX')).toBe('XX');
    expect(getLocationFullName('Unknown')).toBe('Unknown');
    expect(getLocationFullName('')).toBe('');
  });
});

// =============================================================================
// Round-Trip Tests
// =============================================================================

describe('Location Round-Trip', () => {
  const locations = [
    'Head',
    'Center Torso',
    'Left Torso',
    'Right Torso',
    'Left Arm',
    'Right Arm',
    'Left Leg',
    'Right Leg',
    'Front Left Leg',
    'Front Right Leg',
    'Rear Left Leg',
    'Rear Right Leg',
  ];

  it('should round-trip from full name to shorthand and back', () => {
    for (const location of locations) {
      const shorthand = getLocationShorthand(location);
      const fullName = getLocationFullName(shorthand);
      expect(fullName).toBe(location);
    }
  });

  it('should round-trip from shorthand to full name and back', () => {
    const shorthands = [
      'HD',
      'CT',
      'LT',
      'RT',
      'LA',
      'RA',
      'LL',
      'RL',
      'FLL',
      'FRL',
      'RLL',
      'RRL',
    ];
    for (const shorthand of shorthands) {
      const fullName = getLocationFullName(shorthand);
      const backToShorthand = getLocationShorthand(fullName);
      expect(backToShorthand).toBe(shorthand);
    }
  });
});
