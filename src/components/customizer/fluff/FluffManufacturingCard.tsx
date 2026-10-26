/**
 * Fluff Manufacturing card
 *
 * Manufacturer, primary factory and the per-system manufacturer list, laid
 * out as one tidy column of name + value rows with the add action last.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 */

import React, { useState } from 'react';

import type { ISerializedFluff } from '@/types/unit/UnitSerialization';

import { customizerStyles as cs } from '@/components/customizer/styles';
import { Button } from '@/components/ui/Button';

import {
  fieldId,
  formatSystemLabel,
  NameValueRow,
  TextField,
} from './FluffFields';

interface FluffManufacturingCardProps {
  fluff: ISerializedFluff;
  readOnly: boolean;
  onFluffChange?: (patch: Partial<ISerializedFluff>) => void;
}

const ADD_HINT_ID = 'fluff-add-system-hint';

export function FluffManufacturingCard({
  fluff,
  readOnly,
  onFluffChange,
}: FluffManufacturingCardProps): React.ReactElement {
  const [newSystem, setNewSystem] = useState('');
  const [newManufacturer, setNewManufacturer] = useState('');
  const systems = fluff.systemManufacturer ?? {};
  const systemNames = Object.keys(systems);
  const editable = !readOnly && !!onFluffChange;
  const trimmedSystem = newSystem.trim();
  const isDuplicate = Object.hasOwn(systems, trimmedSystem);

  const update = <K extends keyof ISerializedFluff>(
    field: K,
    value: ISerializedFluff[K],
  ): void => onFluffChange?.({ [field]: value });

  const updateSystem = (system: string, manufacturer: string): void => {
    update('systemManufacturer', { ...systems, [system]: manufacturer });
  };

  const addSystem = (): void => {
    if (!trimmedSystem || isDuplicate) return;
    updateSystem(trimmedSystem, newManufacturer.trim());
    setNewSystem('');
    setNewManufacturer('');
  };

  const removeSystem = (system: string): void => {
    const remaining = { ...systems };
    delete remaining[system];
    update('systemManufacturer', remaining);
  };

  return (
    <section className={cs.panel.main} aria-labelledby="fluff-mfg-heading">
      <h3 id="fluff-mfg-heading" className={`${cs.text.cardTitle} mb-3`}>
        Manufacturing
      </h3>
      <div className="flex flex-col gap-3">
        <NameValueRow
          id="fluff-manufacturer"
          label="Manufacturer"
          optional
          value={fluff.manufacturer ?? ''}
          disabled={!editable}
          onChange={(value) => update('manufacturer', value)}
        />
        <NameValueRow
          id="fluff-primary-factory"
          label="Primary Factory"
          optional
          value={fluff.primaryFactory ?? ''}
          disabled={!editable}
          onChange={(value) => update('primaryFactory', value)}
        />
      </div>

      <h4
        className={`${cs.text.subsection} border-border-theme mt-5 mb-3 border-t pt-4`}
      >
        System Manufacturers
      </h4>
      {systemNames.length === 0 && (
        <p className="text-text-theme-secondary pb-3">
          No system manufacturers recorded.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {systemNames.map((system) => (
          <NameValueRow
            key={system}
            id={`fluff-system-${fieldId(system)}`}
            label={formatSystemLabel(system)}
            value={systems[system]}
            disabled={!editable}
            onChange={(value) => updateSystem(system, value)}
            onRemove={editable ? () => removeSystem(system) : undefined}
            removeLabel={`Remove ${system} manufacturer`}
            removeTitle={`Remove ${formatSystemLabel(system)} manufacturer`}
          />
        ))}
      </div>

      {editable && (
        <div className="border-border-theme-subtle mt-4 flex flex-col gap-3 border-t border-dashed pt-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="New System"
              placeholder="e.g. Targeting"
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
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            fullWidth
            leftIcon={<span aria-hidden="true">+</span>}
            aria-describedby={ADD_HINT_ID}
            disabled={!trimmedSystem || isDuplicate}
            onClick={addSystem}
          >
            Add system
          </Button>
          <p id={ADD_HINT_ID} className={cs.text.secondary}>
            {isDuplicate
              ? `${trimmedSystem} already has a manufacturer. Edit it in the list above.`
              : 'Name a system and who makes it.'}
          </p>
        </div>
      )}
    </section>
  );
}
