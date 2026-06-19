import React from 'react';

import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { ISerializedUnitEnvelope } from '@/types/persistence/UnitPersistence';

import { customizerStyles as cs } from '../styles';
import {
  CheckIcon,
  DialogErrorMessage,
  DialogLoadingState,
  WarningIcon,
} from './dialogPresentation';

export type ImportState =
  | 'idle'
  | 'validating'
  | 'conflict'
  | 'importing'
  | 'success'
  | 'error';

export interface ParsedUnit {
  chassis: string;
  variant: string;
  data: ISerializedUnitEnvelope | Record<string, unknown>;
}

function getUnitData(
  data: ISerializedUnitEnvelope | Record<string, unknown>,
): Record<string, unknown> {
  if ('formatVersion' in data && 'unit' in data) {
    return (data as ISerializedUnitEnvelope).unit;
  }

  return data as Record<string, unknown>;
}

function getImportData(parsedUnit: ParsedUnit, alternateName: string) {
  const data = parsedUnit.data as Record<string, unknown>;

  if ('unit' in data && typeof data.unit === 'object' && data.unit !== null) {
    return {
      ...data,
      unit: {
        ...(data.unit as Record<string, unknown>),
        variant: alternateName,
      },
    };
  }

  return { ...data, variant: alternateName };
}

export async function parseImportedFile(file: File): Promise<ParsedUnit> {
  const text = await file.text();
  const data = JSON.parse(text) as
    | ISerializedUnitEnvelope
    | Record<string, unknown>;
  const unitData = getUnitData(data);
  const chassis = unitData.chassis as string | undefined;
  const variant = (unitData.variant || unitData.model) as string | undefined;

  if (!chassis) {
    throw new Error('Missing required field: chassis');
  }
  if (!variant) {
    throw new Error('Missing required field: variant or model');
  }

  return { chassis, variant, data };
}

export async function importParsedUnit(
  parsedUnit: ParsedUnit,
  useAlternateName: boolean,
  alternateName: string,
) {
  const trimmedAlternateName = alternateName.trim();

  if (useAlternateName && trimmedAlternateName) {
    return customUnitApiService.importUnit(
      getImportData(parsedUnit, trimmedAlternateName),
    );
  }

  return customUnitApiService.importUnit(parsedUnit.data);
}

export function getImportedUnitName(
  parsedUnit: ParsedUnit,
  useAlternateName: boolean,
  alternateName: string,
) {
  const trimmedAlternateName = alternateName.trim();

  if (useAlternateName && trimmedAlternateName) {
    return `${parsedUnit.chassis} ${trimmedAlternateName}`;
  }

  return `${parsedUnit.chassis} ${parsedUnit.variant}`;
}

export function ImportDialogContent({
  alternateName,
  dragActive,
  error,
  handleDrag,
  handleDrop,
  handleFileSelect,
  parsedUnit,
  setAlternateName,
  setUseAlternateName,
  state,
  suggestedName,
  useAlternateName,
}: {
  alternateName: string;
  dragActive: boolean;
  error: string | null;
  handleDrag: (event: React.DragEvent) => void;
  handleDrop: (event: React.DragEvent) => void;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  parsedUnit: ParsedUnit | null;
  setAlternateName: (name: string) => void;
  setUseAlternateName: (useAlternateName: boolean) => void;
  state: ImportState;
  suggestedName: string | null;
  useAlternateName: boolean;
}) {
  const isLoading = state === 'validating' || state === 'importing';

  return (
    <div className={cs.dialog.content}>
      <DropZone
        dragActive={dragActive}
        onDrag={handleDrag}
        onDrop={handleDrop}
        onFileSelect={handleFileSelect}
      />

      {parsedUnit && <ParsedUnitInfo parsedUnit={parsedUnit} />}

      {state === 'conflict' && suggestedName && (
        <ConflictResolution
          alternateName={alternateName}
          parsedUnit={parsedUnit}
          setAlternateName={setAlternateName}
          setUseAlternateName={setUseAlternateName}
          useAlternateName={useAlternateName}
        />
      )}

      {error && <DialogErrorMessage message={error} />}

      {isLoading && (
        <DialogLoadingState
          label={state === 'validating' ? 'Validating...' : 'Importing...'}
        />
      )}
    </div>
  );
}

function DropZone({
  dragActive,
  onDrag,
  onDrop,
  onFileSelect,
}: {
  dragActive: boolean;
  onDrag: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      onDragEnter={onDrag}
      onDragLeave={onDrag}
      onDragOver={onDrag}
      onDrop={onDrop}
      className={`${cs.dialog.dropzone} ${dragActive ? cs.dialog.dropzoneActive : ''}`}
    >
      <input
        type="file"
        accept=".json"
        onChange={onFileSelect}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <svg
        className="mx-auto mb-3 h-10 w-10 text-slate-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <p className="text-slate-300">
        Drag and drop a JSON file here, or{' '}
        <span className="text-blue-400 underline">click to browse</span>
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Supports .json files exported from this editor
      </p>
    </div>
  );
}

function ParsedUnitInfo({ parsedUnit }: { parsedUnit: ParsedUnit }) {
  return (
    <div className={cs.dialog.infoPanel}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-white">
            {parsedUnit.chassis} {parsedUnit.variant}
          </div>
          <div className="text-text-theme-secondary text-sm">
            Ready to import
          </div>
        </div>
        <CheckIcon className="h-6 w-6 text-green-400" />
      </div>
    </div>
  );
}

function ConflictResolution({
  alternateName,
  parsedUnit,
  setAlternateName,
  setUseAlternateName,
  useAlternateName,
}: {
  alternateName: string;
  parsedUnit: ParsedUnit | null;
  setAlternateName: (name: string) => void;
  setUseAlternateName: (useAlternateName: boolean) => void;
  useAlternateName: boolean;
}) {
  return (
    <div className={`${cs.dialog.warningPanel} space-y-3`}>
      <div className="flex items-start gap-2">
        <WarningIcon className="text-accent mt-0.5 h-5 w-5" />
        <div>
          <div className="text-accent font-medium">Name Conflict</div>
          <div className="text-accent/80 text-sm">
            A unit named &quot;{parsedUnit?.chassis} {parsedUnit?.variant}
            &quot; already exists.
          </div>
        </div>
      </div>

      <div className="pl-7">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={useAlternateName}
            onChange={(event) => setUseAlternateName(event.target.checked)}
            className="border-border-theme bg-surface-raised focus:ring-offset-surface-base h-4 w-4 rounded text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-300">
            Import with alternate name
          </span>
        </label>

        {useAlternateName && (
          <input
            type="text"
            value={alternateName}
            onChange={(event) => setAlternateName(event.target.value)}
            placeholder="New variant name"
            className={`mt-2 ${cs.dialog.input}`}
          />
        )}
      </div>
    </div>
  );
}
