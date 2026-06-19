import {
  formatSpeed,
  formatTime,
  getNextSpeed,
  getPrevSpeed,
  PLAYBACK_SPEEDS,
} from '../useReplayPlayer';

describe('useReplayPlayer utility functions', () => {
  describe('PLAYBACK_SPEEDS', () => {
    it('should contain expected speeds', () => {
      expect(PLAYBACK_SPEEDS).toContain(0.5);
      expect(PLAYBACK_SPEEDS).toContain(1);
      expect(PLAYBACK_SPEEDS).toContain(2);
      expect(PLAYBACK_SPEEDS).toContain(4);
    });
  });

  describe('getNextSpeed', () => {
    it('should cycle through speeds', () => {
      expect(getNextSpeed(1)).toBe(2);
      expect(getNextSpeed(8)).toBe(0.25);
    });
  });

  describe('getPrevSpeed', () => {
    it('should cycle through speeds backwards', () => {
      expect(getPrevSpeed(1)).toBe(0.5);
      expect(getPrevSpeed(0.25)).toBe(8);
    });
  });

  describe('formatSpeed', () => {
    it('should format speed with x suffix', () => {
      expect(formatSpeed(1)).toBe('1x');
      expect(formatSpeed(0.5)).toBe('0.5x');
      expect(formatSpeed(4)).toBe('4x');
    });
  });

  describe('formatTime', () => {
    it('should format time as mm:ss', () => {
      expect(formatTime(0, 10, 1000, 1)).toBe('0:10');
      expect(formatTime(0, 60, 1000, 1)).toBe('1:00');
      expect(formatTime(0, 10, 1000, 2)).toBe('0:05');
    });
  });
});
