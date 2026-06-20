import {
  logger,
  debug,
  info,
  warn,
  error,
  enableTestMode,
  disableTestMode,
  clearCapturedDiagnostics,
  clearDiagnosticContext,
  disableDiagnosticCapture,
  enableDiagnosticCapture,
  getCapturedDiagnostics,
  setDiagnosticContext,
  withDiagnosticContext,
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
    disableDiagnosticCapture(true);
    clearDiagnosticContext();
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

  describe('structured diagnostics', () => {
    it('captures structured diagnostics without console output when test logging is suppressed', () => {
      disableTestMode();
      enableDiagnosticCapture();

      const entry = logger.diagnostic({
        level: 'warn',
        service: 'journey.combat',
        event: 'tactical.action_rejected',
        message: 'Blocked destination',
        runId: 'run-1',
        journeyId: 'combat-1v1',
        stepId: 'preview-invalid-action',
        entityIds: { unitId: 'unit-1' },
        metadata: { reason: 'occupied' },
      });

      expect(entry).toMatchObject({
        level: 'warn',
        service: 'journey.combat',
        event: 'tactical.action_rejected',
        runId: 'run-1',
        journeyId: 'combat-1v1',
        stepId: 'preview-invalid-action',
      });
      expect(getCapturedDiagnostics()).toHaveLength(1);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('attaches and restores correlation context', () => {
      disableTestMode();
      enableDiagnosticCapture();

      const restore = setDiagnosticContext({
        runId: 'run-a',
        journeyId: 'mek-build',
        entityIds: { unitId: 'atlas' },
      });
      logger.diagnostic({
        level: 'info',
        service: 'journey.mek',
        event: 'mek.exported',
      });
      restore();
      logger.diagnostic({
        level: 'info',
        service: 'journey.character',
        event: 'character.created',
        runId: 'run-b',
      });

      const [first, second] = getCapturedDiagnostics();
      expect(first).toMatchObject({
        runId: 'run-a',
        journeyId: 'mek-build',
        entityIds: { unitId: 'atlas' },
      });
      expect(second).toMatchObject({ runId: 'run-b' });
      expect(second?.journeyId).toBeUndefined();
    });

    it('scopes withDiagnosticContext to the callback', () => {
      disableTestMode();
      enableDiagnosticCapture();

      withDiagnosticContext({ runId: 'scoped-run' }, () => {
        logger.diagnostic({
          level: 'info',
          service: 'journey.runner',
          event: 'journey.started',
        });
      });
      logger.diagnostic({
        level: 'info',
        service: 'journey.runner',
        event: 'journey.finished',
      });

      const [first, second] = getCapturedDiagnostics();
      expect(first?.runId).toBe('scoped-run');
      expect(second?.runId).toBeUndefined();
    });

    it('bounds diagnostic metadata payloads', () => {
      disableTestMode();
      enableDiagnosticCapture();

      logger.diagnostic({
        level: 'info',
        service: 'journey.mek',
        event: 'mek.exported',
        metadata: {
          longText: 'x'.repeat(400),
          nested: { a: { b: { c: { d: 'too deep' } } } },
        },
      });

      const [entry] = getCapturedDiagnostics();
      expect(String(entry?.metadata?.longText).length).toBeLessThanOrEqual(240);
      expect(entry?.metadata?.nested).toEqual({ a: { b: '[object]' } });
    });

    it('clears captured diagnostics on demand', () => {
      disableTestMode();
      enableDiagnosticCapture();
      logger.diagnostic({
        level: 'info',
        service: 'journey.runner',
        event: 'journey.started',
      });

      clearCapturedDiagnostics();

      expect(getCapturedDiagnostics()).toEqual([]);
    });
  });
});
