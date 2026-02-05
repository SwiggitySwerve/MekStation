import type { Meta, StoryObj } from '@storybook/react';

import { useState } from 'react';

import { ControlledInput, ValidationResult } from './ControlledInput';

const meta: Meta<typeof ControlledInput> = {
  title: 'Common/ControlledInput',
  component: ControlledInput,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A controlled input component with real-time validation, debouncing, and visual feedback. Supports text, number, email, and password types.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ControlledInput>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <ControlledInput<string>
        placeholder="Enter text..."
        label="Default Input"
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const WithLabel: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <ControlledInput<string>
        label="Username"
        placeholder="Enter your username"
        required
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const NumberInput: Story = {
  render: () => {
    const [value, setValue] = useState<number>(0);
    return (
      <ControlledInput<number>
        type="number"
        label="Tonnage"
        placeholder="20-100"
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const PasswordInput: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <ControlledInput<string>
        type="password"
        label="Password"
        placeholder="Enter password"
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const EmailInput: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <ControlledInput<string>
        type="email"
        label="Email Address"
        placeholder="user@example.com"
        value={value}
        onChange={setValue}
      />
    );
  },
};

const requiredValidation = (value: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return { isValid: false, error: 'This field is required' };
  }
  return { isValid: true };
};

const minLengthValidation = (value: string): ValidationResult => {
  if (value.length < 3) {
    return { isValid: false, error: 'Must be at least 3 characters' };
  }
  if (value.length < 5) {
    return { isValid: true, warning: 'Consider using a longer value' };
  }
  return { isValid: true };
};

const tonnageValidation = (value: number): ValidationResult => {
  if (typeof value !== 'number' || isNaN(value)) {
    return { isValid: false, error: 'Must be a number' };
  }
  if (value < 20) {
    return { isValid: false, error: 'Minimum tonnage is 20' };
  }
  if (value > 100) {
    return { isValid: false, error: 'Maximum tonnage is 100' };
  }
  if (value % 5 !== 0) {
    return { isValid: true, warning: 'Tonnage is typically a multiple of 5' };
  }
  return { isValid: true };
};

export const WithRequiredValidation: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <ControlledInput<string>
        label="Required Field"
        placeholder="This field is required"
        required
        value={value}
        onChange={setValue}
        validation={requiredValidation}
      />
    );
  },
};

export const WithMinLengthValidation: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <ControlledInput<string>
        label="Mech Name"
        placeholder="Enter mech name (min 3 chars)"
        value={value}
        onChange={setValue}
        validation={minLengthValidation}
      />
    );
  },
};

export const WithNumberValidation: Story = {
  render: () => {
    const [value, setValue] = useState<number>(50);
    return (
      <ControlledInput<number>
        type="number"
        label="Mech Tonnage"
        placeholder="20-100"
        value={value}
        onChange={setValue}
        validation={tonnageValidation}
      />
    );
  },
};

export const Disabled: Story = {
  render: () => {
    const [value] = useState('Cannot edit this');
    return (
      <ControlledInput<string>
        label="Disabled Input"
        value={value}
        onChange={() => {}}
        disabled
      />
    );
  },
};

export const WithInitialValue: Story = {
  render: () => {
    const [value, setValue] = useState('Atlas AS7-D');
    return (
      <ControlledInput<string>
        label="Mech Chassis"
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const AutoFocused: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <ControlledInput<string>
        label="Auto-focused Input"
        placeholder="This input is focused on mount"
        autoFocus
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const FastDebounce: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <ControlledInput<string>
        label="Fast Debounce (100ms)"
        placeholder="Quick response..."
        debounceMs={100}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const SlowDebounce: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <ControlledInput<string>
        label="Slow Debounce (1000ms)"
        placeholder="Delayed response..."
        debounceMs={1000}
        value={value}
        onChange={setValue}
      />
    );
  },
};

export const InteractiveDemo: Story = {
  render: () => {
    const [value, setValue] = useState('');
    const [submitted, setSubmitted] = useState<string | null>(null);

    const validation = (val: string): ValidationResult => {
      if (!val) return { isValid: false, error: 'Mech name is required' };
      if (val.length < 2) return { isValid: false, error: 'Name too short' };
      if (val.length > 20)
        return { isValid: false, error: 'Name too long (max 20)' };
      if (!/^[a-zA-Z0-9-]+$/.test(val)) {
        return { isValid: true, warning: 'Special characters detected' };
      }
      return { isValid: true };
    };

    return (
      <div className="space-y-4">
        <ControlledInput<string>
          label="Custom Mech Name"
          placeholder="e.g., Atlas-Prime"
          value={value}
          onChange={setValue}
          validation={validation}
          required
        />
        <button
          onClick={() => setSubmitted(value)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={!validation(value).isValid}
        >
          Submit
        </button>
        {submitted && (
          <p className="text-sm text-green-600">
            Submitted: <strong>{submitted}</strong>
          </p>
        )}
      </div>
    );
  },
};

export const FormIntegration: Story = {
  render: () => {
    const [name, setName] = useState('');
    const [tonnage, setTonnage] = useState<number>(50);
    const [notes, setNotes] = useState('');

    return (
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <ControlledInput<string>
          label="Mech Name"
          placeholder="Enter designation"
          value={name}
          onChange={setName}
          validation={(v) =>
            v.length >= 2
              ? { isValid: true }
              : { isValid: false, error: 'Required' }
          }
          required
        />
        <ControlledInput<number>
          type="number"
          label="Tonnage"
          placeholder="20-100"
          value={tonnage}
          onChange={setTonnage}
          validation={tonnageValidation}
          required
        />
        <ControlledInput<string>
          label="Notes"
          placeholder="Optional notes..."
          value={notes}
          onChange={setNotes}
        />
        <div className="border-t border-gray-200 pt-2">
          <p className="text-sm text-gray-500">
            Mech: {name || '—'} | Tonnage: {tonnage}t | Notes: {notes || '—'}
          </p>
        </div>
      </form>
    );
  },
};
