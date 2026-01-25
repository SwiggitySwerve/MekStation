import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from './FormField';
import { cs } from '@/components/customizer/styles';

const meta: Meta<typeof FormField> = {
  title: 'UI/FormField',
  component: FormField,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Field label text',
    },
    htmlFor: {
      control: 'text',
      description: 'ID of the form control for accessibility',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    hint: {
      control: 'text',
      description: 'Hint text for guidance',
    },
    required: {
      control: 'boolean',
      description: 'Show required indicator',
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80 p-4 bg-surface-base rounded-lg">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {
  args: {
    label: 'Email Address',
    htmlFor: 'email-default',
    children: (
      <input
        id="email-default"
        type="email"
        placeholder="you@example.com"
        className={cs.dialog.input}
      />
    ),
  },
};

export const WithHint: Story = {
  args: {
    label: 'Password',
    htmlFor: 'password-hint',
    hint: 'Must be at least 8 characters long',
    children: (
      <input
        id="password-hint"
        type="password"
        placeholder="Enter password"
        className={cs.dialog.input}
      />
    ),
  },
};

export const WithError: Story = {
  args: {
    label: 'Email Address',
    htmlFor: 'email-error',
    error: 'Please enter a valid email address',
    children: (
      <input
        id="email-error"
        type="email"
        defaultValue="invalid-email"
        className={`${cs.dialog.input} border-red-500 focus:ring-red-500`}
      />
    ),
  },
};

export const Required: Story = {
  args: {
    label: 'Full Name',
    htmlFor: 'name-required',
    required: true,
    children: (
      <input
        id="name-required"
        type="text"
        placeholder="John Doe"
        className={cs.dialog.input}
      />
    ),
  },
};

export const RequiredWithError: Story = {
  args: {
    label: 'Username',
    htmlFor: 'username-req-error',
    required: true,
    error: 'This field is required',
    children: (
      <input
        id="username-req-error"
        type="text"
        className={`${cs.dialog.input} border-red-500 focus:ring-red-500`}
      />
    ),
  },
};

export const WithSelect: Story = {
  args: {
    label: 'Tech Base',
    htmlFor: 'techbase-select',
    hint: 'Select the technology base for your unit',
    children: (
      <select id="techbase-select" className={cs.dialog.selectFilter}>
        <option value="">Select...</option>
        <option value="IS">Inner Sphere</option>
        <option value="Clan">Clan</option>
        <option value="Mixed">Mixed</option>
      </select>
    ),
  },
};

export const WithTextarea: Story = {
  args: {
    label: 'Description',
    htmlFor: 'description-textarea',
    hint: 'Optional notes about this unit',
    children: (
      <textarea
        id="description-textarea"
        placeholder="Enter description..."
        rows={3}
        className={`${cs.dialog.input} resize-none`}
      />
    ),
  },
};

export const ErrorOverridesHint: Story = {
  args: {
    label: 'Password',
    htmlFor: 'password-error-hint',
    hint: 'Must be at least 8 characters long',
    error: 'Password is too short',
    children: (
      <input
        id="password-error-hint"
        type="password"
        defaultValue="short"
        className={`${cs.dialog.input} border-red-500 focus:ring-red-500`}
      />
    ),
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-6">
      <FormField label="Default Field" htmlFor="state-default">
        <input
          id="state-default"
          type="text"
          placeholder="Normal state"
          className={cs.dialog.input}
        />
      </FormField>

      <FormField label="With Hint" htmlFor="state-hint" hint="Helpful guidance text">
        <input
          id="state-hint"
          type="text"
          placeholder="With hint"
          className={cs.dialog.input}
        />
      </FormField>

      <FormField label="Required Field" htmlFor="state-required" required>
        <input
          id="state-required"
          type="text"
          placeholder="Required"
          className={cs.dialog.input}
        />
      </FormField>

      <FormField
        label="With Error"
        htmlFor="state-error"
        error="This field has an error"
      >
        <input
          id="state-error"
          type="text"
          defaultValue="Invalid value"
          className={`${cs.dialog.input} border-red-500 focus:ring-red-500`}
        />
      </FormField>

      <FormField
        label="Full Example"
        htmlFor="state-full"
        required
        hint="This hint is hidden when there's an error"
        error="Validation failed"
      >
        <input
          id="state-full"
          type="text"
          defaultValue="Bad input"
          className={`${cs.dialog.input} border-red-500 focus:ring-red-500`}
        />
      </FormField>
    </div>
  ),
};

export const InFormContext: Story = {
  render: () => (
    <form className="space-y-4">
      <FormField label="Chassis Name" htmlFor="form-chassis" required>
        <input
          id="form-chassis"
          type="text"
          placeholder="e.g., Atlas"
          className={cs.dialog.input}
        />
      </FormField>

      <FormField
        label="Variant"
        htmlFor="form-variant"
        required
        hint="Enter a unique variant designation"
      >
        <input
          id="form-variant"
          type="text"
          placeholder="e.g., AS7-D"
          className={cs.dialog.input}
        />
      </FormField>

      <FormField label="Tech Base" htmlFor="form-tech">
        <select id="form-tech" className={cs.dialog.selectFilter}>
          <option value="IS">Inner Sphere</option>
          <option value="Clan">Clan</option>
          <option value="Mixed">Mixed</option>
        </select>
      </FormField>

      <FormField label="Notes" htmlFor="form-notes" hint="Optional">
        <textarea
          id="form-notes"
          placeholder="Additional notes..."
          rows={2}
          className={`${cs.dialog.input} resize-none`}
        />
      </FormField>
    </form>
  ),
};
