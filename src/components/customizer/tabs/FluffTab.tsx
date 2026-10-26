/**
 * Fluff Tab Component
 *
 * Non-mechanical unit information (history, description, manufacturer).
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

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

  const renderNarrativeField = ([field, label]: [
    NarrativeField,
    string,
  ]): React.ReactElement => {
    const id = fieldId(field);
    const value = fluff[field] ?? '';
    const disabled = isReadOnly || !onFluffChange;
    return (
      <div key={field} data-testid={`fluff-field-${field}`}>
        <FieldLabel
          htmlFor={id}
          label={label}
          showOptional={!disabled && value === ''}
        />
        <AutoSizeTextarea
          id={id}
          rows={3}
          value={value}
          placeholder={NARRATIVE_PLACEHOLDERS[field]}
          disabled={disabled}
          onChange={(event) => update(field, event.target.value)}
          className={`${NARRATIVE_TEXTAREA} ${disabledClasses(disabled)}`}
        />
      </div>
    );
  };

  return (
    <div className={`@container space-y-5 p-4 ${className}`}>
      {isReadOnly && (
        <div className={cs.panel.notice} role="status">
          This unit&apos;s descriptive details are view only.
        </div>
      )}

      <section
        className="border-border-theme bg-surface-base flex flex-wrap items-end justify-between gap-x-8 gap-y-3 rounded-lg border px-4 py-3"
        aria-labelledby="fluff-role-heading"
      >
        <div className="min-w-0">
          <h3 id="fluff-role-heading" className={cs.text.cardTitle}>
            Battlefield Role
          </h3>
          <p className="text-text-theme-secondary mt-1 text-sm">
            A quick classification used in the unit dossier and export.
          </p>
        </div>
        <label className="block w-full @[40rem]:w-80" htmlFor="fluff-role">
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
        <div className={MANUFACTURING_GRID}>
          <div>
            <TextField
              label="Manufacturer"
              optional
              value={fluff.manufacturer ?? ''}
              disabled={isReadOnly || !onFluffChange}
              onChange={(value) => update('manufacturer', value)}
            />
          </div>
          <div>
            <TextField
              label="Primary Factory"
              optional
              value={fluff.primaryFactory ?? ''}
              disabled={isReadOnly || !onFluffChange}
              onChange={(value) => update('primaryFactory', value)}
            />
          </div>
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
        <div className={MANUFACTURING_GRID}>
          {Object.entries(systems).map(([system, manufacturer]) => (
            <div key={system} className={`${FIELD_WITH_ACTION} items-end`}>
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
                  className="text-text-theme-muted focus-visible:text-text-theme-primary focus-visible:ring-accent flex h-11 w-11 items-center justify-center rounded transition-colors hover:bg-red-950 hover:text-white focus-visible:ring-2 focus-visible:outline-none"
                >
                  <AppIcon name="trash" size="inline" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
        {!isReadOnly && onFluffChange && (
          <div className="border-border-theme-subtle mt-4 rounded-md border border-dashed p-3">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <TextField
                label="New System"
                placeholder="e.g. Targeting system"
                value={newSystem}
                disabled={false}
                onChange={setNewSystem}
              />
              <TextField
                label="New Manufacturer"
                placeholder="e.g. Dalban Hirez"
                value={newManufacturer}
                disabled={false}
                onChange={setNewManufacturer}
              />
              <Button
                type="button"
                size="sm"
                className="min-h-11"
                disabled={
                  !newSystem.trim() || Object.hasOwn(systems, newSystem.trim())
                }
                onClick={addSystem}
              >
                Add system
              </Button>
            </div>
            <p className={`${cs.text.secondary} mt-2`}>
              Name a system and who makes it.
            </p>
          </div>
        )}
      </section>

      <section
        className={`${cs.panel.main} text-base`}
        aria-labelledby="fluff-history-heading"
      >
        <h3 id="fluff-history-heading" className={`${cs.text.cardTitle} mb-3`}>
          Unit History and Description
        </h3>
        <div className={NARRATIVE_COLUMN} data-testid="fluff-narrative">
          {STACKED_FIELDS.map(renderNarrativeField)}
          <div className={NARRATIVE_PAIR}>
            {PAIRED_FIELDS.map(renderNarrativeField)}
          </div>
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

/** Hints for the sections that are usually empty on a new design. */
const NARRATIVE_PLACEHOLDERS: Partial<Record<NarrativeField, string>> = {
  variants: 'e.g. Model name and what changes from this design, one per line.',
  notableUnits: 'e.g. A famous pilot, or one named unit of this design.',
};

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

/**
 * The narrative fills the card at its full content width, left-aligned like
 * the cards above. Overview, Capabilities, History and Deployment stack in
 * one column so each auto-growing box can be as tall as its text without
 * leaving a hole beside a shorter neighbour.
 */
const STACKED_FIELDS = NARRATIVE_FIELDS.filter(
  ([field]) => field !== 'variants' && field !== 'notableUnits',
);

/** Variants and Notable Units are both short, so they pair up on wide. */
const PAIRED_FIELDS = NARRATIVE_FIELDS.filter(
  ([field]) => field === 'variants' || field === 'notableUnits',
);

const NARRATIVE_PAIR = 'grid gap-5 @[48rem]:grid-cols-2';
const NARRATIVE_COLUMN = 'flex flex-col gap-5';

/**
 * Narrative text fills the reading column: 16px text on a 24px (1.5) line
 * height, at least 3 rows; the textarea grows with its content.
 */
const NARRATIVE_TEXTAREA = `${cs.input.full.replace('text-sm', 'text-base')} min-h-[6.5rem] w-full resize-none overflow-hidden leading-6 placeholder:text-text-theme-muted placeholder:italic`;

function disabledClasses(disabled: boolean): string {
  return disabled ? 'cursor-not-allowed opacity-60' : '';
}

/**
 * Two equal columns on wide screens; shared by Manufacturing fields. Plain
 * fields span the full column, ending where the removable rows' action
 * buttons end.
 */
const MANUFACTURING_GRID = 'grid gap-x-6 gap-y-4 lg:grid-cols-2';

/** Field plus a trailing 44px slot so inputs line up with removable rows. */
const FIELD_WITH_ACTION = 'grid grid-cols-[minmax(0,1fr)_2.75rem] gap-1.5';

/**
 * Textarea that always shows its full content: it is sized on mount, whenever
 * the value changes and whenever its width changes (re-wrapping), so text is
 * never clipped mid-line at the bottom edge.
 */
function AutoSizeTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
): React.ReactElement {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback((): void => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const borders = textarea.offsetHeight - textarea.clientHeight;
    textarea.style.height = `${textarea.scrollHeight + borders}px`;
  }, []);

  useLayoutEffect(resize, [props.value, resize]);

  useEffect(() => {
    const textarea = ref.current;
    if (!textarea || typeof ResizeObserver === 'undefined') return undefined;
    let width = textarea.clientWidth;
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth === width) return;
      width = textarea.clientWidth;
      resize();
    });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [resize]);

  return <textarea ref={ref} {...props} />;
}

function TextField({
  id,
  label,
  placeholder,
  optional = false,
  value,
  disabled,
  onChange,
}: {
  id?: string;
  label: string;
  placeholder?: string;
  /** Show an "Optional" tag while the field is empty. */
  optional?: boolean;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}): React.ReactElement {
  const inputId = id ?? fieldId(label);
  return (
    <div>
      <FieldLabel
        htmlFor={inputId}
        label={label}
        showOptional={optional && !disabled && value === ''}
      />
      <input
        id={inputId}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`${cs.input.full} placeholder:text-text-theme-muted min-h-11 placeholder:italic ${disabledClasses(disabled)}`}
      />
    </div>
  );
}

/** Field label with a muted "Optional" tag while an optional field is empty. */
function FieldLabel({
  htmlFor,
  label,
  showOptional,
}: {
  htmlFor: string;
  label: string;
  showOptional: boolean;
}): React.ReactElement {
  return (
    <div className="mb-1 flex items-baseline gap-2">
      <label className={cs.text.label} htmlFor={htmlFor}>
        {label}
      </label>
      {showOptional && (
        <span className="text-text-theme-muted text-sm">Optional</span>
      )}
    </div>
  );
}
