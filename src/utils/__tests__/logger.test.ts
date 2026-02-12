import {
  logger,
  debug,
  info,
  warn,
  error,
  enableTestMode,
  disableTestMode,
} from '../logger';

describe('logger', () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    enableTestMode();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    disableTestMode();
    jest.restoreAllMocks();
  });

  describe('in test environment', () => {
    it('should suppress all log levels when test mode is disabled', () => {
      disableTestMode();
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('exported functions', () => {
    it('should export debug function', () => {
      debug('test');
      expect(consoleDebugSpy).toHaveBeenCalledWith('test');
    });

    it('should export info function', () => {
      info('test');
      expect(consoleInfoSpy).toHaveBeenCalledWith('test');
    });

    it('should export warn function', () => {
      warn('test');
      expect(consoleWarnSpy).toHaveBeenCalledWith('test');
    });

    it('should export error function', () => {
      error('test');
      expect(consoleErrorSpy).toHaveBeenCalledWith('test');
    });
  });

  describe('multiple arguments', () => {
    it('should pass multiple arguments to console methods', () => {
      logger.info('message', { key: 'value' }, 123);
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        'message',
        { key: 'value' },
        123,
      );
    });
  });
});
