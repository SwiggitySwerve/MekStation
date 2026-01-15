import {
  isVibrationSupported,
  tap,
  success,
  error,
  warning,
  light,
  heavy,
  custom,
  cancel,
} from '@/utils/hapticFeedback';

describe('hapticFeedback', () => {
  let vibrateMock: jest.Mock;

  beforeEach(() => {
    vibrateMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(global.navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true,
    });
    jest.clearAllMocks();
  });

  describe('isVibrationSupported', () => {
    it('should return true if vibrate is supported', () => {
      expect(isVibrationSupported()).toBe(true);
    });

    it('should return false if vibrate is not supported', () => {
      Object.defineProperty(global.navigator, 'vibrate', {
        value: undefined,
        configurable: true,
      });
      expect(isVibrationSupported()).toBe(false);
    });
  });

  describe('feedback functions', () => {
    it('tap should vibrate for 50ms', () => {
      tap();
      expect(vibrateMock).toHaveBeenCalledWith(50);
    });

    it('success should use confirmation pattern', () => {
      success();
      expect(vibrateMock).toHaveBeenCalledWith([100, 50, 100]);
    });

    it('error should vibrate for 200ms', () => {
      error();
      expect(vibrateMock).toHaveBeenCalledWith(200);
    });

    it('warning should use warning pattern', () => {
      warning();
      expect(vibrateMock).toHaveBeenCalledWith([50, 50, 50]);
    });

    it('light should vibrate for 25ms', () => {
      light();
      expect(vibrateMock).toHaveBeenCalledWith(25);
    });

    it('heavy should vibrate for 300ms', () => {
      heavy();
      expect(vibrateMock).toHaveBeenCalledWith(300);
    });

    it('custom should use provided pattern', () => {
      custom([10, 20, 30]);
      expect(vibrateMock).toHaveBeenCalledWith([10, 20, 30]);
    });

    it('cancel should vibrate with 0', () => {
      cancel();
      expect(vibrateMock).toHaveBeenCalledWith(0);
    });
  });

  describe('error handling', () => {
    it('should return false if vibrate throws', () => {
      vibrateMock.mockImplementation(() => {
        throw new Error('Vibration failed');
      });
      expect(tap()).toBe(false);
      expect(success()).toBe(false);
      expect(error()).toBe(false);
    });

    it('should return false if not supported', () => {
      Object.defineProperty(global.navigator, 'vibrate', {
        value: undefined,
        configurable: true,
      });
      expect(tap()).toBe(false);
    });
  });
});
