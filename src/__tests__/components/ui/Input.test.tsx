/// <reference types="@testing-library/jest-dom" />
/**
 * Tests for Input Components
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { Input, Select, SearchInput } from '@/components/ui/Input';

describe('Input', () => {
  describe('Base Input', () => {
    it('should render input element', () => {
      render(<Input name="test" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render label when provided', () => {
      render(<Input label="Username" name="username" />);
      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('should use id prop for label association', () => {
      render(<Input label="Email" id="email-input" />);
      expect(screen.getByLabelText('Email')).toHaveAttribute(
        'id',
        'email-input',
      );
    });

    it('should use name as fallback for id', () => {
      render(<Input label="Email" name="email" />);
      expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'email');
    });

    it('should render error message', () => {
      render(<Input error="Field is required" />);
      expect(screen.getByText('Field is required')).toBeInTheDocument();
    });

    it('should apply error border style when error present', () => {
      render(<Input error="Error" />);
      expect(screen.getByRole('textbox')).toHaveClass('border-red-500');
    });

    it('should apply default variant styles', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-4');
      expect(input).toHaveClass('py-2');
      expect(input).toHaveClass('rounded-lg');
    });

    it('should apply large variant styles', () => {
      render(<Input variant="large" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-5');
      expect(input).toHaveClass('py-3');
      expect(input).toHaveClass('rounded-xl');
    });

    it('should apply amber accent by default', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toHaveClass('focus:border-accent');
    });

    it('should apply cyan accent', () => {
      render(<Input accent="cyan" />);
      expect(screen.getByRole('textbox')).toHaveClass('focus:border-cyan-500');
    });

    it('should apply emerald accent', () => {
      render(<Input accent="emerald" />);
      expect(screen.getByRole('textbox')).toHaveClass(
        'focus:border-emerald-500',
      );
    });

    it('should apply violet accent', () => {
      render(<Input accent="violet" />);
      expect(screen.getByRole('textbox')).toHaveClass(
        'focus:border-violet-500',
      );
    });

    it('should apply custom className', () => {
      render(<Input className="custom-class" />);
      expect(screen.getByRole('textbox')).toHaveClass('custom-class');
    });

    it('should handle value changes', () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'test' },
      });
      expect(handleChange).toHaveBeenCalled();
    });

    it('should pass through HTML input attributes', () => {
      render(<Input placeholder="Enter text" disabled maxLength={10} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'Enter text');
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute('maxLength', '10');
    });
  });

  describe('Select', () => {
    const options = [
      { value: 'opt1', label: 'Option 1' },
      { value: 'opt2', label: 'Option 2' },
    ];

    it('should render select element', () => {
      render(<Select options={options} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render all options', () => {
      render(<Select options={options} />);
      expect(
        screen.getByRole('option', { name: 'Option 1' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: 'Option 2' }),
      ).toBeInTheDocument();
    });

    it('should render placeholder option when provided', () => {
      render(<Select options={options} placeholder="Select an option" />);
      expect(
        screen.getByRole('option', { name: 'Select an option' }),
      ).toBeInTheDocument();
    });

    it('should render label when provided', () => {
      render(<Select label="Category" name="category" options={options} />);
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
    });

    it('should apply accent focus class', () => {
      render(<Select options={options} accent="cyan" />);
      expect(screen.getByRole('combobox')).toHaveClass('focus:border-cyan-500');
    });

    it('should apply custom className', () => {
      render(<Select options={options} className="custom-select" />);
      expect(screen.getByRole('combobox')).toHaveClass('custom-select');
    });

    it('should handle selection changes', () => {
      const handleChange = jest.fn();
      render(<Select options={options} onChange={handleChange} />);

      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'opt2' },
      });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('SearchInput', () => {
    it('should render search input', () => {
      render(<SearchInput />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should show search icon', () => {
      const { container } = render(<SearchInput />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should show clear button when value is present and onClear provided', () => {
      render(<SearchInput value="test" onClear={() => {}} />);
      // Should have multiple SVGs - search icon and clear button
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(1);
    });

    it('should not show clear button when value is empty', () => {
      render(<SearchInput value="" onClear={() => {}} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should call onClear when clear button clicked', () => {
      const handleClear = jest.fn();
      render(<SearchInput value="test" onClear={handleClear} />);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClear).toHaveBeenCalledTimes(1);
    });

    it('should apply padding for icon', () => {
      render(<SearchInput />);
      expect(screen.getByRole('textbox')).toHaveClass('pl-10');
    });
  });
});
