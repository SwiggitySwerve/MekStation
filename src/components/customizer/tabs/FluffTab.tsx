/**
 * Fluff Tab Component
 *
 * Non-mechanical unit information (history, description, manufacturer).
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useState } from 'react';

import type { ISerializedFluff } from '@/types/unit/UnitSerialization';

import { customizerStyles as cs } from '@/components/customizer/styles';
import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';

export interface FluffTabProps {
  role?: string;
  fluff?: ISerializedFluff;
  readOnly?: boolean;
  className?: string;
  onRoleChange?: (role: string) => void;
  onFluffChange?: (patch: Partial<ISerializedFluff>) => void;
}

/** Controlled role and lore form shared across unit types. */
export function FluffTab({
  role = '',
  fluff = {},
  readOnly = false,
  className = '',
  onRoleChange,
  onFluffChange,
}: FluffTabProps): React.ReactElement {
  const isReadOnly = readOnly || (!onRoleChange && !onFluffChange);
  const [newSystem, setNewSystem] = useState('');
  const [newManufacturer, setNewManufacturer] = useState('');
  const systems = fluff.systemManufacturer ?? {};
  const roleIsKnown =
    role === '' || ROLES.some((candidate) => candidate === role);
  const update = <K extends keyof ISerializedFluff>(
    field: K,
    value: ISerializedFluff[K],
  ): void => onFluffChange?.({ [field]: value });

  const updateSystem = (system: string, manufacturer: string): void => {
    update('systemManufacturer', { ...systems, [system]: manufacturer });
  };

  const addSystem = (): void => {
    const system = newSystem.trim();
    if (!system || Object.hasOwn(systems, system)) return;
    updateSystem(system, newManufacturer.trim());
    setNewSystem('');
    setNewManufacturer('');
  };

  const removeSystem = (system: string): void => {
    const remaining = { ...systems };
    delete remaining[system];
    update('systemManufacturer', remaining);
  };

  return (
    <div className={`space-y-5 p-4 ${className}`}>
      {isReadOnly && (
        <div className={cs.panel.notice} role="status">
          This unit&apos;s descriptive details are view only.
        </div>
      )}

      <section
        className="border-border-theme bg-surface-base grid gap-3 rounded-lg border px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] sm:items-end"
        aria-labelledby="fluff-role-heading"
      >
        <div>
          <h3 id="fluff-role-heading" className={cs.text.cardTitle}>
            Battlefield Role
          </h3>
          <p className="text-text-theme-secondary mt-1 text-xs">
            A quick classification used in the unit dossier and export.
          </p>
        </div>
        <label className="block" htmlFor="fluff-role">
          <span className={`${cs.text.label} mb-1 block`}>Combat Role</span>
          <select
            id="fluff-role"
            value={role}
            disabled={isReadOnly || !onRoleChange}
            onChange={(event) => onRoleChange?.(event.target.value)}
            className={cs.select.full}
          >
            <option value="">Select a role</option>
            {!roleIsKnown && <option value={role}>{role}</option>}
            {ROLES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      </section>

      <section className={cs.panel.main} aria-labelledby="fluff-mfg-heading">
        <h3 id="fluff-mfg-heading" className={`${cs.text.cardTitle} mb-3`}>
          Manufacturing
        </h3>
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <TextField
            label="Manufacturer"
            value={fluff.manufacturer ?? ''}
            disabled={isReadOnly || !onFluffChange}
            onChange={(value) => update('manufacturer', value)}
          />
          <TextField
            label="Primary Factory"
            value={fluff.primaryFactory ?? ''}
            disabled={isReadOnly || !onFluffChange}
            onChange={(value) => update('primaryFactory', value)}
          />
        </div>
        <h4
          className={`${cs.text.subsection} border-border-theme mt-6 mb-3 border-t pt-4`}
        >
          System Manufacturers
        </h4>
        {Object.keys(systems).length === 0 && (
          <p className="text-text-theme-secondary py-3">
            No system manufacturers recorded.
          </p>
        )}
        <div className="grid gap-x-6 gap-y-4 lg:grid-cols-2">
          {Object.entries(systems).map(([system, manufacturer]) => (
            <div
              key={system}
              className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-end gap-1.5"
            >
              <TextField
                id={`fluff-system-${fieldId(system)}`}
                label={formatSystemLabel(system)}
                value={manufacturer}
                disabled={isReadOnly || !onFluffChange}
                onChange={(value) => updateSystem(system, value)}
              />
              {!isReadOnly && onFluffChange && (
                <button
                  type="button"
                  aria-label={`Remove ${system} manufacturer`}
                  title={`Remove ${formatSystemLabel(system)} manufacturer`}
                  onClick={() => removeSystem(system)}
                  className="border-border-theme text-text-theme-secondary focus-visible:ring-accent flex h-11 w-11 items-center justify-center rounded border transition-colors hover:bg-red-950 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
                >
                  <AppIcon name="trash" size="inline" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
        {!isReadOnly && onFluffChange && (
          <div className="bg-surface-deep/40 border-border-theme-subtle mt-4 grid max-w-3xl gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_auto] sm:items-end">
            <TextField
              label="New System"
              value={newSystem}
              disabled={false}
              onChange={setNewSystem}
            />
            <TextField
              label="New Manufacturer"
              value={newManufacturer}
              disabled={false}
              onChange={setNewManufacturer}
            />
            <Button
              type="button"
              size="sm"
              disabled={
                !newSystem.trim() || Object.hasOwn(systems, newSystem.trim())
              }
              onClick={addSystem}
            >
              Add system
            </Button>
          </div>
        )}
      </section>

      <section
        className={cs.panel.main}
        aria-labelledby="fluff-history-heading"
      >
        <h3 id="fluff-history-heading" className={`${cs.text.cardTitle} mb-3`}>
          Unit History and Description
        </h3>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {NARRATIVE_FIELDS.map(([field, label]) => {
            const id = fieldId(field);
            return (
              <label key={field} className="block" htmlFor={id}>
                <span className={`${cs.text.label} mb-1 block`}>{label}</span>
                <textarea
                  id={id}
                  rows={field === 'overview' ? 8 : 6}
                  onInput={autoGrowTextarea}
                  value={fluff[field] ?? ''}
                  disabled={isReadOnly || !onFluffChange}
                  onChange={(event) => update(field, event.target.value)}
                  className={`${cs.input.full} min-h-32 resize-y leading-6 ${disabledClasses(
                    isReadOnly || !onFluffChange,
                  )}`}
                />
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}
const ROLES = [
  'Ambusher',
  'Brawler',
  'Fire Support',
  'Juggernaut',
  'Missile Boat',
  'Scout',
  'Skirmisher',
  'Sniper',
  'Striker',
] as const;

type NarrativeField = keyof Pick<
  ISerializedFluff,
  | 'overview'
  | 'capabilities'
  | 'history'
  | 'deployment'
  | 'variants'
  | 'notableUnits'
>;

const NARRATIVE_FIELDS: ReadonlyArray<[NarrativeField, string]> = [
  ['overview', 'Overview'],
  ['capabilities', 'Capabilities'],
  ['history', 'History'],
  ['deployment', 'Deployment'],
  ['variants', 'Variants'],
  ['notableUnits', 'Notable Units'],
];

function fieldId(name: string): string {
  return `fluff-${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`;
}

/**
 * System names arrive as data keys (often all caps, e.g. "CHASSIS"). Show
 * them as ordinary field labels; the stored key is never changed. Short
 * all-caps tokens (ECM, CASE) stay as acronyms.
 */
function formatSystemLabel(system: string): string {
  if (system !== system.toUpperCase()) return system;
  return system
    .split(' ')
    .map((word) =>
      word.length <= 3 ? word : word.charAt(0) + word.slice(1).toLowerCase(),
    )
    .join(' ');
}

function disabledClasses(disabled: boolean): string {
  return disabled ? 'cursor-not-allowed opacity-60' : '';
}

function autoGrowTextarea(event: React.FormEvent<HTMLTextAreaElement>): void {
  const textarea = event.currentTarget;
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

function TextField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id?: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}): React.ReactElement {
  const inputId = id ?? fieldId(label);
  return (
    <label className="block" htmlFor={inputId}>
      <span className={`${cs.text.label} mb-1 block`}>{label}</span>
      <input
        id={inputId}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`${cs.input.full} min-h-11 ${disabledClasses(disabled)}`}
      />
    </label>
  );
}
