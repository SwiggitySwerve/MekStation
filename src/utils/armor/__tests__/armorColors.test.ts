/**
 * Armor Color Utilities Tests
 *
 * Tests for armor visualization color constants and utility functions.
 */

import {
  ARMOR_STATUS,
  SELECTED_COLOR,
  SELECTED_STROKE,
  HOVER_LIGHTEN,
  FRONT_ARMOR_COLOR,
  REAR_ARMOR_COLOR,
  FRONT_ARMOR_LIGHT,
  REAR_ARMOR_LIGHT,
  MEGAMEK_COLORS,
  FRONT_RATIO,
  REAR_RATIO,
  getArmorStatusColor,
  getMegaMekStatusColor,
  getMegaMekFrontStatusColor,
  getMegaMekRearStatusColor,
  getTorsoFrontStatusColor,
  getTorsoRearStatusColor,
  getTorsoStatusColor,
  getTorsoFillPercent,
  lightenColor,
  darkenColor,
  getArmorGradientId,
} from '../armorColors';

// =============================================================================
// Constants Tests
// =============================================================================

describe('ARMOR_STATUS', () => {
  it('should have correct threshold values', () => {
    expect(ARMOR_STATUS.HEALTHY.min).toBe(0.6);
    expect(ARMOR_STATUS.MODERATE.min).toBe(0.4);
    expect(ARMOR_STATUS.LOW.min).toBe(0.2);
    expect(ARMOR_STATUS.CRITICAL.min).toBe(0);
  });

  it('should have valid hex color values', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    expect(ARMOR_STATUS.HEALTHY.color).toMatch(hexPattern);
    expect(ARMOR_STATUS.MODERATE.color).toMatch(hexPattern);
    expect(ARMOR_STATUS.LOW.color).toMatch(hexPattern);
    expect(ARMOR_STATUS.CRITICAL.color).toMatch(hexPattern);
  });
});

describe('Color Constants', () => {
  const hexPattern = /^#[0-9a-fA-F]{6}$/;

  it('should have valid selected colors', () => {
    expect(SELECTED_COLOR).toMatch(hexPattern);
    expect(SELECTED_STROKE).toMatch(hexPattern);
  });

  it('should have valid front/rear armor colors', () => {
    expect(FRONT_ARMOR_COLOR).toMatch(hexPattern);
    expect(REAR_ARMOR_COLOR).toMatch(hexPattern);
    expect(FRONT_ARMOR_LIGHT).toMatch(hexPattern);
    expect(REAR_ARMOR_LIGHT).toMatch(hexPattern);
  });

  it('should have valid MegaMek colors', () => {
    expect(MEGAMEK_COLORS.HEALTHY).toMatch(hexPattern);
    expect(MEGAMEK_COLORS.MODERATE).toMatch(hexPattern);
    expect(MEGAMEK_COLORS.LOW).toMatch(hexPattern);
    expect(MEGAMEK_COLORS.CRITICAL).toMatch(hexPattern);
    expect(MEGAMEK_COLORS.OUTLINE).toMatch(hexPattern);
    expect(MEGAMEK_COLORS.SHADOW).toMatch(hexPattern);
  });

  it('should have correct hover lighten value', () => {
    expect(HOVER_LIGHTEN).toBe(0.15);
  });
});

describe('Armor Ratios', () => {
  it('should have correct front/rear ratio values', () => {
    expect(FRONT_RATIO).toBe(0.75);
    expect(REAR_RATIO).toBe(0.25);
  });

  it('should sum to 1.0', () => {
    expect(FRONT_RATIO + REAR_RATIO).toBe(1.0);
  });
});

// =============================================================================
// getArmorStatusColor Tests
// =============================================================================

describe('getArmorStatusColor', () => {
  it('should return HEALTHY color for >= 60%', () => {
    expect(getArmorStatusColor(60, 100)).toBe(ARMOR_STATUS.HEALTHY.color);
    expect(getArmorStatusColor(80, 100)).toBe(ARMOR_STATUS.HEALTHY.color);
    expect(getArmorStatusColor(100, 100)).toBe(ARMOR_STATUS.HEALTHY.color);
  });

  it('should return MODERATE color for 40-59%', () => {
    expect(getArmorStatusColor(40, 100)).toBe(ARMOR_STATUS.MODERATE.color);
    expect(getArmorStatusColor(50, 100)).toBe(ARMOR_STATUS.MODERATE.color);
    expect(getArmorStatusColor(59, 100)).toBe(ARMOR_STATUS.MODERATE.color);
  });

  it('should return LOW color for 20-39%', () => {
    expect(getArmorStatusColor(20, 100)).toBe(ARMOR_STATUS.LOW.color);
    expect(getArmorStatusColor(30, 100)).toBe(ARMOR_STATUS.LOW.color);
    expect(getArmorStatusColor(39, 100)).toBe(ARMOR_STATUS.LOW.color);
  });

  it('should return CRITICAL color for < 20%', () => {
    expect(getArmorStatusColor(0, 100)).toBe(ARMOR_STATUS.CRITICAL.color);
    expect(getArmorStatusColor(10, 100)).toBe(ARMOR_STATUS.CRITICAL.color);
    expect(getArmorStatusColor(19, 100)).toBe(ARMOR_STATUS.CRITICAL.color);
  });

  it('should return CRITICAL color when maximum is 0', () => {
    expect(getArmorStatusColor(0, 0)).toBe(ARMOR_STATUS.CRITICAL.color);
    expect(getArmorStatusColor(5, 0)).toBe(ARMOR_STATUS.CRITICAL.color);
  });

  it('should handle edge cases at threshold boundaries', () => {
    // Exactly at 60%
    expect(getArmorStatusColor(6, 10)).toBe(ARMOR_STATUS.HEALTHY.color);
    // Just below 60%
    expect(getArmorStatusColor(59, 100)).toBe(ARMOR_STATUS.MODERATE.color);
  });
});

// =============================================================================
// getMegaMekStatusColor Tests
// =============================================================================

describe('getMegaMekStatusColor', () => {
  it('should return MegaMek HEALTHY color for >= 60%', () => {
    expect(getMegaMekStatusColor(60, 100)).toBe(MEGAMEK_COLORS.HEALTHY);
    expect(getMegaMekStatusColor(100, 100)).toBe(MEGAMEK_COLORS.HEALTHY);
  });

  it('should return MegaMek MODERATE color for 40-59%', () => {
    expect(getMegaMekStatusColor(40, 100)).toBe(MEGAMEK_COLORS.MODERATE);
    expect(getMegaMekStatusColor(50, 100)).toBe(MEGAMEK_COLORS.MODERATE);
  });

  it('should return MegaMek LOW color for 20-39%', () => {
    expect(getMegaMekStatusColor(20, 100)).toBe(MEGAMEK_COLORS.LOW);
    expect(getMegaMekStatusColor(30, 100)).toBe(MEGAMEK_COLORS.LOW);
  });

  it('should return MegaMek CRITICAL color for < 20%', () => {
    expect(getMegaMekStatusColor(0, 100)).toBe(MEGAMEK_COLORS.CRITICAL);
    expect(getMegaMekStatusColor(10, 100)).toBe(MEGAMEK_COLORS.CRITICAL);
  });

  it('should return CRITICAL when maximum is 0', () => {
    expect(getMegaMekStatusColor(0, 0)).toBe(MEGAMEK_COLORS.CRITICAL);
  });
});

// =============================================================================
// getMegaMekFrontStatusColor Tests
// =============================================================================

describe('getMegaMekFrontStatusColor', () => {
  it('should calculate status based on expected front max (75%)', () => {
    // Total max = 100, expected front = 75
    // 75 front armor = 100% of expected = HEALTHY
    expect(getMegaMekFrontStatusColor(75, 100)).toBe(MEGAMEK_COLORS.HEALTHY);
    
    // 45 front armor = 60% of expected = HEALTHY
    expect(getMegaMekFrontStatusColor(45, 100)).toBe(MEGAMEK_COLORS.HEALTHY);
    
    // 30 front armor = 40% of expected = MODERATE
    expect(getMegaMekFrontStatusColor(30, 100)).toBe(MEGAMEK_COLORS.MODERATE);
  });

  it('should handle zero total max', () => {
    expect(getMegaMekFrontStatusColor(0, 0)).toBe(MEGAMEK_COLORS.CRITICAL);
  });
});

// =============================================================================
// getMegaMekRearStatusColor Tests
// =============================================================================

describe('getMegaMekRearStatusColor', () => {
  it('should calculate status based on expected rear max (25%)', () => {
    // Total max = 100, expected rear = 25
    // 25 rear armor = 100% of expected = HEALTHY
    expect(getMegaMekRearStatusColor(25, 100)).toBe(MEGAMEK_COLORS.HEALTHY);
    
    // 15 rear armor = 60% of expected = HEALTHY
    expect(getMegaMekRearStatusColor(15, 100)).toBe(MEGAMEK_COLORS.HEALTHY);
    
    // 10 rear armor = 40% of expected = MODERATE
    expect(getMegaMekRearStatusColor(10, 100)).toBe(MEGAMEK_COLORS.MODERATE);
  });

  it('should handle zero total max', () => {
    expect(getMegaMekRearStatusColor(0, 0)).toBe(MEGAMEK_COLORS.CRITICAL);
  });
});

// =============================================================================
// getTorsoFrontStatusColor Tests
// =============================================================================

describe('getTorsoFrontStatusColor', () => {
  it('should use 75% of total max as expected front capacity', () => {
    // Total max = 100, expected front = 75
    // 75 front = 100% = HEALTHY
    expect(getTorsoFrontStatusColor(75, 100)).toBe(ARMOR_STATUS.HEALTHY.color);
    
    // 45 front = 60% = HEALTHY
    expect(getTorsoFrontStatusColor(45, 100)).toBe(ARMOR_STATUS.HEALTHY.color);
  });
});

// =============================================================================
// getTorsoRearStatusColor Tests
// =============================================================================

describe('getTorsoRearStatusColor', () => {
  it('should use 25% of total max as expected rear capacity', () => {
    // Total max = 100, expected rear = 25
    // 25 rear = 100% = HEALTHY
    expect(getTorsoRearStatusColor(25, 100)).toBe(ARMOR_STATUS.HEALTHY.color);
    
    // 15 rear = 60% = HEALTHY
    expect(getTorsoRearStatusColor(15, 100)).toBe(ARMOR_STATUS.HEALTHY.color);
  });
});

// =============================================================================
// getTorsoStatusColor Tests
// =============================================================================

describe('getTorsoStatusColor', () => {
  it('should calculate status based on total (front + rear) armor', () => {
    // Total max = 100, front 60 + rear 20 = 80 total = 80% = HEALTHY
    expect(getTorsoStatusColor(60, 100, 20)).toBe(ARMOR_STATUS.HEALTHY.color);
    
    // Total max = 100, front 30 + rear 10 = 40 total = 40% = MODERATE
    expect(getTorsoStatusColor(30, 100, 10)).toBe(ARMOR_STATUS.MODERATE.color);
  });

  it('should default rear to 0 if not provided', () => {
    // Front only, 60 of 100 = 60% = HEALTHY
    expect(getTorsoStatusColor(60, 100)).toBe(ARMOR_STATUS.HEALTHY.color);
  });
});

// =============================================================================
// getTorsoFillPercent Tests
// =============================================================================

describe('getTorsoFillPercent', () => {
  it('should calculate fill percentage based on total armor', () => {
    // Front 50 + rear 25 = 75 of 100 = 75%
    expect(getTorsoFillPercent(50, 100, 25)).toBe(75);
    
    // Front 100 + rear 0 = 100 of 100 = 100%
    expect(getTorsoFillPercent(100, 100, 0)).toBe(100);
  });

  it('should return 0 when max is 0', () => {
    expect(getTorsoFillPercent(50, 0, 25)).toBe(0);
  });

  it('should cap at 100%', () => {
    // Front 80 + rear 30 = 110 of 100 = capped at 100%
    expect(getTorsoFillPercent(80, 100, 30)).toBe(100);
  });

  it('should default rear to 0', () => {
    expect(getTorsoFillPercent(50, 100)).toBe(50);
  });
});

// =============================================================================
// lightenColor Tests
// =============================================================================

describe('lightenColor', () => {
  it('should lighten a color by the specified amount', () => {
    // Black (#000000) lightened should have higher RGB values
    const lightened = lightenColor('#000000', 0.5);
    expect(lightened).not.toBe('#000000');
    // Should contain higher hex values
    const num = parseInt(lightened.replace('#', ''), 16);
    expect(num).toBeGreaterThan(0);
  });

  it('should cap at maximum brightness (255 per channel)', () => {
    // White cannot be lightened further
    const lightened = lightenColor('#ffffff', 0.5);
    expect(lightened).toBe('#ffffff');
  });

  it('should handle partial lightening', () => {
    const original = '#808080'; // mid-gray
    const lightened = lightenColor(original, 0.1);
    // Should be lighter but not white
    expect(lightened).not.toBe(original);
    expect(lightened).not.toBe('#ffffff');
  });

  it('should return valid hex format', () => {
    const result = lightenColor('#123456', 0.2);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });
});

// =============================================================================
// darkenColor Tests
// =============================================================================

describe('darkenColor', () => {
  it('should darken a color by the specified amount', () => {
    // White (#ffffff) darkened should have lower RGB values
    const darkened = darkenColor('#ffffff', 0.5);
    expect(darkened).not.toBe('#ffffff');
  });

  it('should cap at minimum brightness (0 per channel)', () => {
    // Black cannot be darkened further
    const darkened = darkenColor('#000000', 0.5);
    expect(darkened).toBe('#000000');
  });

  it('should handle partial darkening', () => {
    const original = '#808080'; // mid-gray
    const darkened = darkenColor(original, 0.1);
    // Should be darker but not black
    expect(darkened).not.toBe(original);
    expect(darkened).not.toBe('#000000');
  });

  it('should return valid hex format', () => {
    const result = darkenColor('#abcdef', 0.2);
    expect(result).toMatch(/^#[0-9a-f]{6}$/);
  });
});

// =============================================================================
// getArmorGradientId Tests
// =============================================================================

describe('getArmorGradientId', () => {
  it('should return selected gradient when selected', () => {
    expect(getArmorGradientId(50, 100, true)).toBe('url(#armor-gradient-selected)');
  });

  it('should return critical gradient when max is 0', () => {
    expect(getArmorGradientId(0, 0, false)).toBe('url(#armor-gradient-critical)');
  });

  it('should return healthy gradient for >= 60%', () => {
    expect(getArmorGradientId(60, 100, false)).toBe('url(#armor-gradient-healthy)');
    expect(getArmorGradientId(100, 100, false)).toBe('url(#armor-gradient-healthy)');
  });

  it('should return moderate gradient for 40-59%', () => {
    expect(getArmorGradientId(40, 100, false)).toBe('url(#armor-gradient-moderate)');
    expect(getArmorGradientId(59, 100, false)).toBe('url(#armor-gradient-moderate)');
  });

  it('should return low gradient for 20-39%', () => {
    expect(getArmorGradientId(20, 100, false)).toBe('url(#armor-gradient-low)');
    expect(getArmorGradientId(39, 100, false)).toBe('url(#armor-gradient-low)');
  });

  it('should return critical gradient for < 20%', () => {
    expect(getArmorGradientId(0, 100, false)).toBe('url(#armor-gradient-critical)');
    expect(getArmorGradientId(19, 100, false)).toBe('url(#armor-gradient-critical)');
  });
});
