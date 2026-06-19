import React from 'react';

export type SelectOptionValue = string | number;

export interface SelectOption<T extends SelectOptionValue = SelectOptionValue> {
  value: T;
  label: React.ReactNode;
}

interface SelectOptionsProps<T extends SelectOptionValue> {
  options: readonly SelectOption<T>[];
}

export function SelectOptions<T extends SelectOptionValue>({
  options,
}: SelectOptionsProps<T>): React.ReactElement {
  return (
    <>
      {options.map((option) => (
        <option key={String(option.value)} value={option.value}>
          {option.label}
        </option>
      ))}
    </>
  );
}

export function toSelectOptions<T extends SelectOptionValue>(
  values: readonly T[],
  formatLabel: (value: T) => React.ReactNode,
): SelectOption<T>[] {
  return values.map((value) => ({ value, label: formatLabel(value) }));
}
