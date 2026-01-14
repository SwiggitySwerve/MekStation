/**
 * Tests for equipment name abbreviations utility
 */

import { abbreviateEquipmentName } from '@/utils/equipmentNameAbbreviations';

describe('abbreviateEquipmentName', () => {
  it('should abbreviate (Clan) to (C)', () => {
    expect(abbreviateEquipmentName('ER Medium Laser (Clan)')).toBe('ER Medium Laser (C)');
    expect(abbreviateEquipmentName('Endo Steel (Clan)')).toBe('Endo Steel (C)');
  });

  it('should abbreviate (Inner Sphere) to (IS)', () => {
    expect(abbreviateEquipmentName('ER Large Laser (Inner Sphere)')).toBe('ER Large Laser (IS)');
  });

  it('should abbreviate Extended Range to ER', () => {
    expect(abbreviateEquipmentName('Extended Range Large Laser')).toBe('ER Large Laser');
  });

  it('should abbreviate pulse laser types', () => {
    expect(abbreviateEquipmentName('Large Pulse Laser')).toBe('LPL Laser');
    expect(abbreviateEquipmentName('Medium Pulse Laser')).toBe('MPL Laser');
    expect(abbreviateEquipmentName('Small Pulse Laser')).toBe('SPL Laser');
  });

  it('should abbreviate Ultra AC to UAC', () => {
    expect(abbreviateEquipmentName('Ultra AC/5')).toBe('UAC/5');
  });

  it('should abbreviate Streak SRM to SSRM', () => {
    expect(abbreviateEquipmentName('Streak SRM 4')).toBe('SSRM 4');
  });

  it('should abbreviate heat sink types', () => {
    expect(abbreviateEquipmentName('Double Heat Sink')).toBe('DHS');
    expect(abbreviateEquipmentName('Heat Sink')).toBe('HS');
  });

  it('should abbreviate jump jets', () => {
    expect(abbreviateEquipmentName('Jump Jet')).toBe('JJ');
    // Improved Jump Jet becomes "Improved JJ" because Jump Jet -> JJ runs
    expect(abbreviateEquipmentName('Improved Jump Jet')).toBe('Improved JJ');
  });

  it('should abbreviate electronics', () => {
    expect(abbreviateEquipmentName('Targeting Computer')).toBe('TC');
    expect(abbreviateEquipmentName('Anti-Missile System')).toBe('AMS');
    expect(abbreviateEquipmentName('Beagle Active Probe')).toBe('BAP');
  });

  it('should handle structure types appropriately', () => {
    // Endo Steel stays full, Ferro-Fibrous abbreviated to Ferro-Fib
    expect(abbreviateEquipmentName('Endo Steel')).toBe('Endo Steel');
    expect(abbreviateEquipmentName('Ferro-Fibrous')).toBe('Ferro-Fib');
    expect(abbreviateEquipmentName('Ferro-Fibrous Armor')).toBe('Ferro-Fib Armor');
  });

  it('should handle multiple abbreviations in one name', () => {
    expect(abbreviateEquipmentName('Extended Range Medium Laser (Clan)')).toBe('ER Medium Laser (C)');
  });

  it('should return unchanged name if no abbreviations apply', () => {
    expect(abbreviateEquipmentName('Medium Laser')).toBe('Medium Laser');
    expect(abbreviateEquipmentName('AC/10')).toBe('AC/10');
  });

  it('should be case insensitive for (Clan) abbreviation', () => {
    expect(abbreviateEquipmentName('Medium Laser (CLAN)')).toBe('Medium Laser (C)');
    expect(abbreviateEquipmentName('Medium Laser (clan)')).toBe('Medium Laser (C)');
  });
});
