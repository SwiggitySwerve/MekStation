/**
 * Logger utility with configurable log levels.
 * Suppresses debug in production, all logs in test (unless test mode enabled).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface IDiagnosticLogContext {
  runId?: string;
  journeyId?: string;
  stepId?: string;
  requestId?: string;
  entityIds?: Record<string, string>;
}

export interface IDiagnosticLogInput extends IDiagnosticLogContext {
  level: LogLevel;
  service: string;
  event: string;
  message?: string;
  metadata?: Record<string, unknown>;
  error?: unknown;
}

export interface IDiagnosticLogEntry extends IDiagnosticLogInput {
  timestamp: string;
  entityIds?: Record<string, string>;
  error?: {
    message: string;
    name?: string;
    stack?: string;
  };
}

let testMode: boolean = false;
let diagnosticCaptureEnabled: boolean = false;
let diagnosticContext: IDiagnosticLogContext = {};
let capturedDiagnostics: IDiagnosticLogEntry[] = [];

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

function toDiagnosticError(error: unknown): IDiagnosticLogEntry['error'] {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }
  if (error === undefined) return undefined;
  return { message: String(error) };
}

function boundDiagnosticValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > 240 ? `${value.slice(0, 237)}...` : value;
  }
  if (typeof value !== 'object') return value;
  if (depth >= 3) return '[object]';
  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((item) => boundDiagnosticValue(item, depth + 1));
  }

  const bounded: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(
    value as Record<string, unknown>,
  ).slice(0, 40)) {
    bounded[key] = boundDiagnosticValue(entry, depth + 1);
  }
  return bounded;
}

function buildDiagnosticEntry(input: IDiagnosticLogInput): IDiagnosticLogEntry {
  return {
    ...diagnosticContext,
    ...input,
    timestamp: new Date().toISOString(),
    entityIds: {
      ...diagnosticContext.entityIds,
      ...input.entityIds,
    },
    metadata: boundDiagnosticValue(input.metadata ?? {}) as Record<
      string,
      unknown
    >,
    error: toDiagnosticError(input.error),
  };
}

function emitDiagnostic(input: IDiagnosticLogInput): IDiagnosticLogEntry {
  const entry = buildDiagnosticEntry(input);
  if (diagnosticCaptureEnabled) {
    capturedDiagnostics.push(entry);
  }
  if (shouldLog(input.level)) {
    const consoleMethod = console[input.level] as (...args: unknown[]) => void;
    consoleMethod(`[${entry.service}:${entry.event}]`, entry);
  }
  return entry;
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
  diagnostic: emitDiagnostic,
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

export function enableDiagnosticCapture(clearExisting = true): void {
  diagnosticCaptureEnabled = true;
  if (clearExisting) clearCapturedDiagnostics();
}

export function disableDiagnosticCapture(clearExisting = false): void {
  diagnosticCaptureEnabled = false;
  if (clearExisting) clearCapturedDiagnostics();
}

export function clearCapturedDiagnostics(): void {
  capturedDiagnostics = [];
}

export function getCapturedDiagnostics(): IDiagnosticLogEntry[] {
  return [...capturedDiagnostics];
}

export function setDiagnosticContext(
  context: IDiagnosticLogContext,
): () => void {
  const previous = diagnosticContext;
  diagnosticContext = {
    ...diagnosticContext,
    ...context,
    entityIds: {
      ...diagnosticContext.entityIds,
      ...context.entityIds,
    },
  };
  return () => {
    diagnosticContext = previous;
  };
}

export function clearDiagnosticContext(): void {
  diagnosticContext = {};
}

export function withDiagnosticContext<T>(
  context: IDiagnosticLogContext,
  callback: () => T,
): T {
  const restore = setDiagnosticContext(context);
  try {
    return callback();
  } finally {
    restore();
  }
}
