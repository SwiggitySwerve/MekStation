import {
  isVibrationSupported,
  triggerHaptic,
  stopHaptic,
  getPressedStyles,
  getPressedClass,
  getTouchButtonClasses,
  getIconButtonClasses,
  triggerFeedback,
  withFeedback,
  PRESSED_CLASSES,
  VIBRATION_PATTERNS,
} from '@/utils/touch/gestureFeedback';

describe('gestureFeedback', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('isVibrationSupported', () => {
    it('should return true if vibrate is in navigator', () => {
      Object.defineProperty(global.navigator, 'vibrate', {
        value: jest.fn(),
        configurable: true,
      });
      expect(isVibrationSupported()).toBe(true);
    });

    it('should return false if vibrate is not in navigator', () => {
      Object.defineProperty(global.navigator, 'vibrate', {
        value: undefined,
        configurable: true,
      });
      // In JSDOM, navigator is always defined, but we can simulate missing vibrate
      const hasVibrate = 'vibrate' in global.navigator;
      if (hasVibrate) {
        // @ts-ignore
        delete global.navigator.vibrate;
      }
      expect(isVibrationSupported()).toBe(false);
      
      // Restore for other tests
      Object.defineProperty(global.navigator, 'vibrate', {
        value: jest.fn(),
        configurable: true,
      });
    });
  });

  describe('triggerHaptic', () => {
    let vibrateMock: jest.Mock;

    beforeEach(() => {
      vibrateMock = jest.fn().mockReturnValue(true);
      Object.defineProperty(global.navigator, 'vibrate', {
        value: vibrateMock,
        configurable: true,
      });
    });

    it('should call vibrate with correct pattern for light', () => {
      triggerHaptic('light');
      expect(vibrateMock).toHaveBeenCalledWith(VIBRATION_PATTERNS.light);
    });

    it('should call vibrate with correct pattern for medium', () => {
      triggerHaptic('medium');
      expect(vibrateMock).toHaveBeenCalledWith(VIBRATION_PATTERNS.medium);
    });

    it('should call vibrate with correct pattern for heavy', () => {
      triggerHaptic('heavy');
      expect(vibrateMock).toHaveBeenCalledWith(VIBRATION_PATTERNS.heavy);
    });

    it('should call vibrate with correct pattern for selection', () => {
      triggerHaptic('selection');
      expect(vibrateMock).toHaveBeenCalledWith(VIBRATION_PATTERNS.selection);
    });

    it('should call vibrate with correct pattern for error', () => {
      triggerHaptic('error');
      expect(vibrateMock).toHaveBeenCalledWith(VIBRATION_PATTERNS.error);
    });

    it('should return false if vibration is not supported', () => {
      Object.defineProperty(global.navigator, 'vibrate', {
        value: undefined,
        configurable: true,
      });
      // @ts-ignore
      delete global.navigator.vibrate;
      expect(triggerHaptic('light')).toBe(false);
    });
  });

  describe('stopHaptic', () => {
    let vibrateMock: jest.Mock;

    beforeEach(() => {
      vibrateMock = jest.fn();
      Object.defineProperty(global.navigator, 'vibrate', {
        value: vibrateMock,
        configurable: true,
      });
    });

    it('should call vibrate with 0', () => {
      stopHaptic();
      expect(vibrateMock).toHaveBeenCalledWith(0);
    });
  });

  describe('getPressedStyles', () => {
    it('should return default styles if no config provided', () => {
      const result = getPressedStyles();
      expect(result.style.transform).toBe('scale(0.97)');
      expect(result.style.opacity).toBe(0.9);
      expect(result.className).toBe(PRESSED_CLASSES.default);
    });

    it('should respect custom scaleFactor', () => {
      const result = getPressedStyles({ scaleFactor: 0.95 });
      expect(result.style.transform).toBe('scale(0.95)');
    });

    it('should respect custom opacity', () => {
      const result = getPressedStyles({ opacity: 0.8 });
      expect(result.style.opacity).toBe(0.8);
    });
  });

  describe('getPressedClass', () => {
    it('should return default class', () => {
      expect(getPressedClass()).toBe(PRESSED_CLASSES.default);
    });

    it('should return specific variant class', () => {
      expect(getPressedClass('scale')).toBe(PRESSED_CLASSES.scale);
      expect(getPressedClass('darken')).toBe(PRESSED_CLASSES.darken);
    });
  });

  describe('getTouchButtonClasses', () => {
    it('should return a string containing touch target and active classes', () => {
      const classes = getTouchButtonClasses();
      expect(classes).toContain('min-w-touch');
      expect(classes).toContain('min-h-touch');
      expect(classes).toContain('active:scale');
    });
  });

  describe('getIconButtonClasses', () => {
    it('should return correct classes for default size', () => {
      const classes = getIconButtonClasses();
      expect(classes).toContain('p-2.5');
      expect(classes).toContain('min-w-touch');
    });

    it('should return correct classes for small size', () => {
      const classes = getIconButtonClasses('sm');
      expect(classes).toContain('p-2');
    });

    it('should return correct classes for large size', () => {
      const classes = getIconButtonClasses('lg');
      expect(classes).toContain('p-3');
    });
  });

  describe('triggerFeedback', () => {
    let vibrateMock: jest.Mock;

    beforeEach(() => {
      vibrateMock = jest.fn();
      Object.defineProperty(global.navigator, 'vibrate', {
        value: vibrateMock,
        configurable: true,
      });
    });

    it('should trigger haptic by default', () => {
      triggerFeedback();
      expect(vibrateMock).toHaveBeenCalled();
    });

    it('should not trigger haptic if haptic is false', () => {
      triggerFeedback({ haptic: false });
      expect(vibrateMock).not.toHaveBeenCalled();
    });

    it('should respect intensity', () => {
      triggerFeedback({ intensity: 'heavy' });
      expect(vibrateMock).toHaveBeenCalledWith(VIBRATION_PATTERNS.heavy);
    });
  });

  describe('withFeedback', () => {
    let vibrateMock: jest.Mock;

    beforeEach(() => {
      vibrateMock = jest.fn();
      Object.defineProperty(global.navigator, 'vibrate', {
        value: vibrateMock,
        configurable: true,
      });
    });

    it('should call callback and trigger feedback', () => {
      const callback = jest.fn();
      const wrapped = withFeedback(callback, { intensity: 'medium' });
      
      wrapped('arg1', 'arg2');
      
      expect(vibrateMock).toHaveBeenCalledWith(VIBRATION_PATTERNS.medium);
      expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });
});
