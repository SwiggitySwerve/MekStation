/**
 * Tests for ControlledInput component
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ControlledInput, useControlledInput, ValidationResult } from '@/components/common/ControlledInput';

// Mock timers for debounce testing
jest.useFakeTimers();

describe('ControlledInput', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Rendering', () => {
    it('should render input element', () => {
      render(<ControlledInput {...defaultProps} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should display label when provided', () => {
      render(<ControlledInput {...defaultProps} label="Username" />);

      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('should show required indicator', () => {
      render(<ControlledInput {...defaultProps} label="Username" required />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should display placeholder', () => {
      render(<ControlledInput {...defaultProps} placeholder="Enter username" />);

      expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
    });

    it('should render with initial value', () => {
      render(<ControlledInput {...defaultProps} value="Initial value" />);

      expect(screen.getByRole('textbox')).toHaveValue('Initial value');
    });
  });

  describe('Input types', () => {
    it('should render text input by default', () => {
      render(<ControlledInput {...defaultProps} />);

      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
    });

    it('should render number input when type is number', () => {
      render(<ControlledInput {...defaultProps} type="number" />);

      expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
    });

    it('should render password input', () => {
      render(<ControlledInput {...defaultProps} type="password" />);

      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Value changes', () => {
    it('should update local value on change', () => {
      render(<ControlledInput {...defaultProps} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'New value' } });

      expect(input).toHaveValue('New value');
    });

    it('should debounce onChange callback', () => {
      const onChange = jest.fn();
      render(<ControlledInput {...defaultProps} onChange={onChange} debounceMs={300} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'Test' } });

      expect(onChange).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onChange).toHaveBeenCalledWith('Test');
    });

    it('should sync with external value changes', () => {
      const { rerender } = render(<ControlledInput {...defaultProps} value="Initial" />);

      expect(screen.getByRole('textbox')).toHaveValue('Initial');

      rerender(<ControlledInput {...defaultProps} value="Updated" />);

      expect(screen.getByRole('textbox')).toHaveValue('Updated');
    });
  });

  describe('Validation', () => {
    const requiredValidation = (value: string): ValidationResult => ({
      isValid: value.length > 0,
      error: value.length === 0 ? 'Field is required' : undefined,
    });

    const warningValidation = (value: string): ValidationResult => ({
      isValid: true,
      warning: value.length < 5 ? 'Value is short' : undefined,
    });

    it('should show validation error after change', () => {
      render(
        <ControlledInput 
          {...defaultProps} 
          value="test"
          validation={requiredValidation}
        />
      );
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: '' } });

      expect(screen.getByText('Field is required')).toBeInTheDocument();
    });

    it('should show warning message', () => {
      render(
        <ControlledInput 
          {...defaultProps}
          validation={warningValidation}
        />
      );
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'Hi' } });

      expect(screen.getByText('Value is short')).toBeInTheDocument();
    });

    it('should call onValidationChange when validation changes', () => {
      const onValidationChange = jest.fn();
      render(
        <ControlledInput 
          {...defaultProps}
          validation={requiredValidation}
          onValidationChange={onValidationChange}
        />
      );
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'test' } });

      expect(onValidationChange).toHaveBeenCalled();
    });

    it('should not call onChange when validation fails', () => {
      const onChange = jest.fn();
      render(
        <ControlledInput 
          {...defaultProps}
          value="valid"
          onChange={onChange}
          validation={requiredValidation}
        />
      );
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: '' } });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should not show validation until dirty', () => {
      render(
        <ControlledInput 
          {...defaultProps}
          value=""
          validation={requiredValidation}
        />
      );

      expect(screen.queryByText('Field is required')).not.toBeInTheDocument();
    });
  });

  describe('Disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<ControlledInput {...defaultProps} disabled />);

      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should have disabled styling', () => {
      render(<ControlledInput {...defaultProps} disabled />);

      expect(screen.getByRole('textbox')).toHaveClass('cursor-not-allowed');
    });
  });

  describe('Focus and blur', () => {
    it('should call onFocus when focused', () => {
      const onFocus = jest.fn();
      render(<ControlledInput {...defaultProps} onFocus={onFocus} />);

      fireEvent.focus(screen.getByRole('textbox'));

      expect(onFocus).toHaveBeenCalled();
    });

    it('should call onBlur when blurred', () => {
      const onBlur = jest.fn();
      render(<ControlledInput {...defaultProps} onBlur={onBlur} />);

      fireEvent.blur(screen.getByRole('textbox'));

      expect(onBlur).toHaveBeenCalled();
    });

    it('should validate and call onChange on blur', () => {
      const onChange = jest.fn();
      render(<ControlledInput {...defaultProps} onChange={onChange} />);
      const input = screen.getByRole('textbox');

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.blur(input);

      expect(onChange).toHaveBeenCalledWith('Test');
    });
  });

  describe('Keyboard events', () => {
    it('should call onKeyDown', () => {
      const onKeyDown = jest.fn();
      render(<ControlledInput {...defaultProps} onKeyDown={onKeyDown} />);

      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

      expect(onKeyDown).toHaveBeenCalled();
    });

    it('should call onKeyUp', () => {
      const onKeyUp = jest.fn();
      render(<ControlledInput {...defaultProps} onKeyUp={onKeyUp} />);

      fireEvent.keyUp(screen.getByRole('textbox'), { key: 'Enter' });

      expect(onKeyUp).toHaveBeenCalled();
    });
  });

  describe('AutoFocus', () => {
    it('should autofocus when autoFocus is true', () => {
      render(<ControlledInput {...defaultProps} autoFocus />);

      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });
});

describe('useControlledInput hook', () => {
  const TestComponent = ({ 
    initialValue = '', 
    validation 
  }: { 
    initialValue?: string; 
    validation?: (value: string) => ValidationResult;
  }) => {
    const {
      value,
      isDirty,
      handleChange,
      reset,
      isValid,
      error,
    } = useControlledInput(initialValue, validation);

    return (
      <div>
        <input
          data-testid="input"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
        />
        <span data-testid="is-dirty">{isDirty.toString()}</span>
        <span data-testid="is-valid">{isValid.toString()}</span>
        <span data-testid="error">{error || 'No error'}</span>
        <button onClick={reset}>Reset</button>
      </div>
    );
  };

  it('should initialize with initial value', () => {
    render(<TestComponent initialValue="Initial" />);

    expect(screen.getByTestId('input')).toHaveValue('Initial');
  });

  it('should mark as dirty after change', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('is-dirty').textContent).toBe('false');

    fireEvent.change(screen.getByTestId('input'), { target: { value: 'Changed' } });

    expect(screen.getByTestId('is-dirty').textContent).toBe('true');
  });

  it('should validate on change', () => {
    const validation = (value: string): ValidationResult => ({
      isValid: value.length >= 3,
      error: value.length < 3 ? 'Too short' : undefined,
    });

    render(<TestComponent validation={validation} />);

    fireEvent.change(screen.getByTestId('input'), { target: { value: 'ab' } });

    expect(screen.getByTestId('is-valid').textContent).toBe('false');
    expect(screen.getByTestId('error').textContent).toBe('Too short');
  });

  it('should reset to initial state', () => {
    render(<TestComponent initialValue="Initial" />);

    fireEvent.change(screen.getByTestId('input'), { target: { value: 'Changed' } });
    expect(screen.getByTestId('input')).toHaveValue('Changed');
    expect(screen.getByTestId('is-dirty').textContent).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByTestId('input')).toHaveValue('Initial');
    expect(screen.getByTestId('is-dirty').textContent).toBe('false');
  });
});

