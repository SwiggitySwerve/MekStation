import * as hapticFeedback from '../../utils/hapticFeedback';

// Mock navigator.vibrate
const mockVibrate = jest.fn(() => true);
Object.defineProperty(navigator, 'vibrate', {
  value: mockVibrate,
  writable: true,
  configurable: true,
});

describe('hapticFeedback', () => {
  beforeEach(() => {
    mockVibrate.mockClear();
    mockVibrate.mockReturnValue(true);
  });

  describe('isVibrationSupported', () => {
    it('should return true when navigator.vibrate exists', () => {
      expect(hapticFeedback.isVibrationSupported()).toBe(true);
    });

    it('should return false when navigator.vibrate does not exist', () => {
      // @ts-ignore - testing missing vibrate
      delete navigator.vibrate;

      expect(hapticFeedback.isVibrationSupported()).toBe(false);

      // Restore vibrate
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true,
      });
    });

    it('should return false when navigator is undefined', () => {
      // Store original navigator
      const originalNavigator = global.navigator;

      // @ts-ignore - testing undefined navigator
      delete global.navigator;

      expect(hapticFeedback.isVibrationSupported()).toBe(false);

      // Restore navigator
      global.navigator = originalNavigator;
    });
  });

  describe('tap', () => {
    it('should trigger 50ms vibration', () => {
      const result = hapticFeedback.tap();

      expect(mockVibrate).toHaveBeenCalledWith(50);
      expect(result).toBe(true);
    });

    it('should return false when vibration not supported', () => {
      // @ts-ignore - testing missing vibrate
      delete navigator.vibrate;

      const result = hapticFeedback.tap();

      expect(result).toBe(false);
      expect(mockVibrate).not.toHaveBeenCalled();

      // Restore vibrate
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true,
      });
    });

    it('should return false on vibrate error', () => {
      mockVibrate.mockImplementation(() => {
        throw new Error('Vibration failed');
      });

      const result = hapticFeedback.tap();

      expect(result).toBe(false);
    });
  });

  describe('success', () => {
    it('should trigger success pattern (100, 50, 100)', () => {
      const result = hapticFeedback.success();

      expect(mockVibrate).toHaveBeenCalledWith([100, 50, 100]);
      expect(result).toBe(true);
    });

    it('should return false when vibration not supported', () => {
      // @ts-ignore
      delete navigator.vibrate;

      const result = hapticFeedback.success();

      expect(result).toBe(false);
      expect(mockVibrate).not.toHaveBeenCalled();

      // Restore
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('error', () => {
    it('should trigger 200ms error pulse', () => {
      const result = hapticFeedback.error();

      expect(mockVibrate).toHaveBeenCalledWith(200);
      expect(result).toBe(true);
    });

    it('should return false when vibration not supported', () => {
      // @ts-ignore
      delete navigator.vibrate;

      const result = hapticFeedback.error();

      expect(result).toBe(false);

      // Restore
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('warning', () => {
    it('should trigger warning pattern (50, 50, 50)', () => {
      const result = hapticFeedback.warning();

      expect(mockVibrate).toHaveBeenCalledWith([50, 50, 50]);
      expect(result).toBe(true);
    });
  });

  describe('light', () => {
    it('should trigger 25ms light tap', () => {
      const result = hapticFeedback.light();

      expect(mockVibrate).toHaveBeenCalledWith(25);
      expect(result).toBe(true);
    });
  });

  describe('heavy', () => {
    it('should trigger 300ms heavy vibration', () => {
      const result = hapticFeedback.heavy();

      expect(mockVibrate).toHaveBeenCalledWith(300);
      expect(result).toBe(true);
    });
  });

  describe('custom', () => {
    it('should trigger custom single vibration', () => {
      const result = hapticFeedback.custom(150);

      expect(mockVibrate).toHaveBeenCalledWith(150);
      expect(result).toBe(true);
    });

    it('should trigger custom pattern', () => {
      const pattern = [50, 100, 50, 100, 50];
      const result = hapticFeedback.custom(pattern);

      expect(mockVibrate).toHaveBeenCalledWith(pattern);
      expect(result).toBe(true);
    });

    it('should handle empty pattern', () => {
      const result = hapticFeedback.custom([]);

      expect(mockVibrate).toHaveBeenCalledWith([]);
      expect(result).toBe(true);
    });

    it('should return false when vibration not supported', () => {
      // @ts-ignore
      delete navigator.vibrate;

      const result = hapticFeedback.custom(100);

      expect(result).toBe(false);

      // Restore
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('cancel', () => {
    it('should cancel ongoing vibration', () => {
      hapticFeedback.cancel();

      expect(mockVibrate).toHaveBeenCalledWith(0);
    });

    it('should not throw when vibration not supported', () => {
      // @ts-ignore
      delete navigator.vibrate;

      expect(() => hapticFeedback.cancel()).not.toThrow();

      // Restore
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true,
      });
    });

    it('should not throw on vibrate error', () => {
      mockVibrate.mockImplementation(() => {
        throw new Error('Cancel failed');
      });

      expect(() => hapticFeedback.cancel()).not.toThrow();
    });
  });

  describe('practical scenarios', () => {
    it('should handle equipment assignment', () => {
      const result = hapticFeedback.tap();

      expect(result).toBe(true);
      expect(mockVibrate).toHaveBeenCalledWith(50);
    });

    it('should handle save complete', () => {
      const result = hapticFeedback.success();

      expect(result).toBe(true);
      expect(mockVibrate).toHaveBeenCalledWith([100, 50, 100]);
    });

    it('should handle validation error', () => {
      const result = hapticFeedback.error();

      expect(result).toBe(true);
      expect(mockVibrate).toHaveBeenCalledWith(200);
    });

    it('should handle destructive action confirmation', () => {
      const result = hapticFeedback.warning();

      expect(result).toBe(true);
      expect(mockVibrate).toHaveBeenCalledWith([50, 50, 50]);
    });

    it('should handle scroll to top', () => {
      const result = hapticFeedback.light();

      expect(result).toBe(true);
      expect(mockVibrate).toHaveBeenCalledWith(25);
    });

    it('should handle factory reset', () => {
      const result = hapticFeedback.heavy();

      expect(result).toBe(true);
      expect(mockVibrate).toHaveBeenCalledWith(300);
    });
  });

  describe('error handling', () => {
    it('should handle all functions gracefully when vibrate throws', () => {
      mockVibrate.mockImplementation(() => {
        throw new Error('Vibration error');
      });

      expect(hapticFeedback.tap()).toBe(false);
      expect(hapticFeedback.success()).toBe(false);
      expect(hapticFeedback.error()).toBe(false);
      expect(hapticFeedback.warning()).toBe(false);
      expect(hapticFeedback.light()).toBe(false);
      expect(hapticFeedback.heavy()).toBe(false);
      expect(hapticFeedback.custom(100)).toBe(false);
    });
  });

  describe('vibration return values', () => {
    it('should return true when vibrate returns true', () => {
      mockVibrate.mockReturnValue(true);

      expect(hapticFeedback.tap()).toBe(true);
      expect(hapticFeedback.success()).toBe(true);
      expect(hapticFeedback.error()).toBe(true);
    });

    it('should return false when vibrate returns false', () => {
      mockVibrate.mockReturnValue(false);

      expect(hapticFeedback.tap()).toBe(false);
      expect(hapticFeedback.success()).toBe(false);
      expect(hapticFeedback.error()).toBe(false);
    });

    it('should handle undefined return from vibrate', () => {
      mockVibrate.mockReturnValue(undefined);

      // When vibrate returns undefined, the function returns undefined
      expect(hapticFeedback.tap()).toBeUndefined();
    });
  });
});
