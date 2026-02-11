/**
 * Logger utility with configurable log levels.
 * Suppresses debug in production, all logs in test (unless test mode enabled).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
let testMode: boolean = false;

function getEnvironment(): 'development' | 'production' | 'test' {
  if (typeof process !== 'undefined' && process.env.NODE_ENV) {
    return process.env.NODE_ENV as 'development' | 'production' | 'test';
  }
  return 'development';
}

function shouldLog(level: LogLevel): boolean {
  const env = getEnvironment();
  if (env === 'test' && !testMode) return false;
  if (env === 'production' && level === 'debug') return false;
  return true;
}

export const logger = {
  debug: (...args: unknown[]): void => {
    if (shouldLog('debug')) console.debug(...args);
  },
  info: (...args: unknown[]): void => {
    if (shouldLog('info')) console.info(...args);
  },
  warn: (...args: unknown[]): void => {
    if (shouldLog('warn')) console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    if (shouldLog('error')) console.error(...args);
  },
};

export const debug = logger.debug;
export const info = logger.info;
export const warn = logger.warn;
export const error = logger.error;

export function enableTestMode(): void {
  testMode = true;
}

export function disableTestMode(): void {
  testMode = false;
}
