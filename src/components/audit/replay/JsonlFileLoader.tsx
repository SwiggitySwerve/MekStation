/**
 * JsonlFileLoader — drag-and-drop loader for swarm-produced
 * `<gameId>.jsonl` event-log files.
 *
 * Per `add-replay-viewer-from-ndjson` (quick-session delta — "Replay
 * Viewer Consumes Persisted NDJSON Files"): accepts a file via drag-drop
 * OR file picker, parses NDJSON line-by-line, validates each line as
 * `IGameEvent` via the type guard from `GameSessionInterfaces.ts`, and
 * promotes the resulting `readonly IGameEvent[]` to the host page via
 * `onEventsLoaded(events, filename)`. Per-line errors surface in the
 * UI; on ANY error, no events are promoted.
 *
 * The loader is purely client-side — no network calls, no server-side
 * upload. The file's bytes are processed in-browser via `FileReader`.
 *
 * @spec openspec/changes/add-replay-viewer-from-ndjson/specs/quick-session/spec.md
 */

import React, { useCallback, useRef, useState } from 'react';

import type { IGameEvent } from '@/types/gameplay';

import { isGameEvent } from '@/types/gameplay/GameSessionInterfaces';

// =============================================================================
// Public types
// =============================================================================

/**
 * Per-line parse / validation error reported to the user when a file
 * cannot be promoted. `line` is 1-indexed to match the user's editor
 * conventions.
 */
export interface JsonlLineError {
  readonly line: number;
  readonly error: 'not valid JSON' | 'not a valid IGameEvent';
}

export interface JsonlFileLoaderProps {
  /**
   * Called when a file successfully parses and every line validates.
   * The host page promotes the events as the new replay source.
   */
  readonly onEventsLoaded: (
    events: readonly IGameEvent[],
    filename: string,
  ) => void;
  /** Called when the user clicks the "clear upload" affordance. */
  readonly onClearUpload: () => void;
  /** When set, indicates uploaded events are currently active. */
  readonly uploadedFilename?: string | null;
  /** Status prefix shown before the active replay source name. */
  readonly loadedLabel?: string;
  /** Button text for clearing the active replay source. */
  readonly clearLabel?: string;
  /** Accessible label for clearing the active replay source. */
  readonly clearAriaLabel?: string;
  /** Total event count of the currently-loaded file (for the status pill). */
  readonly eventCount?: number;
  /** Min turn from the loaded file (for the status pill). */
  readonly minTurn?: number;
  /** Max turn from the loaded file (for the status pill). */
  readonly maxTurn?: number;
}

// =============================================================================
// Pure parse helper (exported for unit tests)
// =============================================================================

/**
 * Parse a UTF-8 NDJSON string into either a list of events OR a list
 * of per-line errors. Empty lines are tolerated (the runner does NOT
 * write a trailing newline, but we tolerate it). Any single error in
 * the file means no events are returned — the spec requires
 * all-or-nothing promotion so the user knows exactly what to fix.
 */
export function parseNdjsonEvents(
  contents: string,
):
  | { readonly ok: true; readonly events: readonly IGameEvent[] }
  | { readonly ok: false; readonly errors: readonly JsonlLineError[] } {
  const lines = contents.split('\n');
  const errors: JsonlLineError[] = [];
  const events: IGameEvent[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (raw.length === 0) {
      // Empty line — tolerated (covers trailing newlines and accidental
      // blank lines). Spec rule "strip empty lines" applies before
      // validation.
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      errors.push({ line: i + 1, error: 'not valid JSON' });
      continue;
    }

    if (!isGameEvent(parsed)) {
      errors.push({ line: i + 1, error: 'not a valid IGameEvent' });
      continue;
    }

    events.push(parsed);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, events };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Drop zone + file picker for swarm-produced `.jsonl` event logs.
 *
 * Renders one of three states:
 *   1. Idle — drop zone visible, "or click to browse" affordance.
 *   2. Errors — per-line error list, drop zone re-enabled for retry.
 *   3. Loaded — status pill with filename + event count + turn range,
 *      "clear upload" button.
 */
export function JsonlFileLoader({
  onEventsLoaded,
  onClearUpload,
  uploadedFilename,
  loadedLabel = 'loaded',
  clearLabel = 'clear upload',
  clearAriaLabel = 'Clear uploaded file',
  eventCount,
  minTurn,
  maxTurn,
}: JsonlFileLoaderProps): React.ReactElement {
  const [errors, setErrors] = useState<readonly JsonlLineError[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Process a single picked / dropped file. Reads as text, runs the
  // parse pipeline, and either promotes events or surfaces errors.
  const handleFile = useCallback(
    (file: File) => {
      // Reset previous error state before this attempt.
      setErrors([]);

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        const result = parseNdjsonEvents(text);
        if (result.ok) {
          onEventsLoaded(result.events, file.name);
        } else {
          setErrors(result.errors);
        }
      });
      reader.addEventListener('error', () => {
        // FileReader errors are rare (browser-level read failures);
        // surface a single line-0 error so the user still sees feedback.
        setErrors([{ line: 0, error: 'not valid JSON' }]);
      });
      reader.readAsText(file, 'utf-8');
    },
    [onEventsLoaded],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file !== undefined) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(true);
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePickClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file !== undefined) {
        handleFile(file);
      }
      // Reset the input so picking the same file twice still triggers
      // a change event.
      event.target.value = '';
    },
    [handleFile],
  );

  const handleClearClick = useCallback(() => {
    setErrors([]);
    onClearUpload();
  }, [onClearUpload]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // "Loaded" state — collapse the drop zone to a status pill so the
  // page's primary content (hex map + scrubber) keeps maximum vertical
  // real estate.
  if (uploadedFilename !== undefined && uploadedFilename !== null) {
    return (
      <div
        data-testid="jsonl-loader-status"
        className="border-border-theme-subtle bg-surface-raised flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
      >
        <div className="text-text-theme-secondary truncate text-sm">
          <span className="text-text-theme-muted">{loadedLabel}</span>{' '}
          <span className="text-text-theme-primary font-mono">
            {uploadedFilename}
          </span>{' '}
          <span className="text-text-theme-muted">
            ({eventCount ?? 0} events
            {typeof minTurn === 'number' && typeof maxTurn === 'number'
              ? `, turns ${minTurn}–${maxTurn}`
              : ''}
            )
          </span>
        </div>
        <button
          type="button"
          onClick={handleClearClick}
          className="text-text-theme-secondary hover:text-text-theme-primary rounded-md px-2 py-1 text-xs transition-colors"
          aria-label={clearAriaLabel}
          data-testid="jsonl-loader-clear"
        >
          {clearLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        data-testid="jsonl-loader-dropzone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handlePickClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handlePickClick();
          }
        }}
        className={`border-border-theme-subtle bg-surface-raised hover:border-accent flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
          isDragging ? 'border-accent bg-accent/10' : ''
        }`}
        aria-label="Drop a .jsonl event-log file or click to browse"
      >
        <p className="text-text-theme-primary text-sm font-medium">
          Drop a .jsonl event-log file
        </p>
        <p className="text-text-theme-muted text-xs">or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          accept=".jsonl,application/x-ndjson,application/json,text/plain"
          onChange={handleFileInputChange}
          className="hidden"
          data-testid="jsonl-loader-file-input"
        />
      </div>

      {errors.length > 0 && (
        <div
          data-testid="jsonl-loader-errors"
          className="border-error-theme bg-error-theme/10 max-h-40 overflow-y-auto rounded-lg border px-3 py-2 text-xs"
          role="alert"
        >
          <p className="text-error-theme mb-1 font-medium">
            File rejected ({errors.length} error{errors.length === 1 ? '' : 's'}
            ). No events were loaded.
          </p>
          <ul className="text-error-theme/90 list-inside list-disc space-y-0.5 font-mono">
            {errors.slice(0, 20).map((err) => (
              <li key={err.line}>
                line {err.line}: {err.error}
              </li>
            ))}
            {errors.length > 20 && (
              <li className="text-text-theme-muted">
                …and {errors.length - 20} more
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
