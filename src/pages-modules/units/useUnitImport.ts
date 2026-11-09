import { useEffect, useRef, useState } from 'react';

import { getFileService } from '@/services/persistence/FileService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';

type Selection = { filename: string; payload: Record<string, unknown> };
type ImportState =
  | { status: 'idle' | 'reading' }
  | (Selection & { status: 'ready' | 'importing' })
  | (Selection & { status: 'conflict'; message: string; suggestion: string })
  | {
      status: 'error';
      message: string;
      selection?: Selection;
      warnings?: readonly string[];
    }
  | { status: 'success'; id: string; warnings?: readonly string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface UnitImportController {
  state: ImportState;
  selectFile(file: File): Promise<void>;
  submit(variant?: string): Promise<void>;
  reset(): void;
}

/** Request ownership covers file reads, conflict suggestions and POST completions. */
export function useUnitImport(
  onImported: (id: string) => void,
): UnitImportController {
  const [state, setState] = useState<ImportState>({ status: 'idle' });
  const snapshot = useRef(state);
  const request = useRef(0);
  const commit = (next: ImportState) => {
    snapshot.current = next;
    setState(next);
  };
  const reset = () => {
    request.current += 1;
    commit({ status: 'idle' });
  };
  useEffect(
    () => () => {
      request.current += 1;
    },
    [],
  );

  async function selectFile(file: File) {
    if (
      snapshot.current.status === 'importing' ||
      snapshot.current.status === 'success'
    )
      return;
    const token = ++request.current;
    commit({ status: 'reading' });
    try {
      if (!/\.(json|mtf|blk)$/i.test(file.name))
        throw new Error('Choose a JSON, MTF or BLK file.');
      const result = await getFileService().importUnit(file);
      if (token !== request.current) return;
      if (!result.success || !isRecord(result.unit))
        throw new Error(
          result.errors?.join('\n') || 'Could not read unit file',
        );
      commit({ status: 'ready', filename: file.name, payload: result.unit });
    } catch (error) {
      if (token === request.current)
        commit({
          status: 'error',
          message:
            error instanceof Error ? error.message : 'Could not read unit file',
        });
    }
  }

  async function submit(variant?: string) {
    const current = snapshot.current;
    if (
      current.status !== 'ready' &&
      current.status !== 'conflict' &&
      current.status !== 'error'
    )
      return;
    const selection = current.status === 'error' ? current.selection : current;
    if (!selection || (current.status === 'conflict' && !variant?.trim()))
      return;
    let payload = selection.payload;
    if (variant?.trim()) {
      const renamed = { variant: variant.trim(), model: variant.trim() };
      payload =
        'sourceFormat' in payload
          ? { ...payload, variant: variant.trim() }
          : isRecord(payload.unit)
            ? { ...payload, unit: { ...payload.unit, ...renamed } }
            : { ...payload, ...renamed };
    }
    const chosen = { filename: selection.filename, payload };
    const token = ++request.current;
    // Synchronous snapshot update closes the double-click/Enter window.
    commit({ status: 'importing', ...chosen });
    try {
      const result = await customUnitApiService.importUnit(payload);
      if (token !== request.current) return;
      if (result.success && result.id) {
        commit({ status: 'success', id: result.id, warnings: result.warnings });
        onImported(result.id);
      } else if (result.requiresRename) {
        commit({
          status: 'conflict',
          ...chosen,
          message: result.error || 'Unit already exists',
          suggestion: '',
        });
        let suggestion = result.suggestedName?.suggestedVariant || '';
        if (!('sourceFormat' in payload)) {
          const unit = isRecord(payload.unit) ? payload.unit : payload;
          if (typeof unit.chassis === 'string') {
            const name = await customUnitApiService.suggestCloneName(
              unit.chassis,
              String(unit.variant || unit.model || ''),
            );
            suggestion = name.suggestedVariant;
          }
        }
        if (token === request.current)
          commit({
            status: 'conflict',
            ...chosen,
            message: result.error || 'Unit already exists',
            suggestion,
          });
      } else {
        commit({
          status: 'error',
          selection: chosen,
          message: [
            result.error || 'Failed to import unit',
            ...(result.validationErrors ?? []),
          ].join('\n'),
          warnings: result.warnings,
        });
      }
    } catch (error) {
      if (token === request.current && snapshot.current.status !== 'success')
        commit({
          status: 'error',
          selection: chosen,
          message:
            error instanceof Error
              ? error.message
              : 'Server unavailable. Try again.',
        });
    }
  }
  return { state, selectFile, submit, reset };
}
