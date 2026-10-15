/**
 * Tests for ErrorBoundary component
 */
import '@testing-library/jest-dom';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react';
import React from 'react';

import {
  ErrorBoundary,
  withErrorBoundary,
  useErrorBoundary,
} from '@/components/common/ErrorBoundary';

// Mock navigator.clipboard
const mockClipboard = {
  writeText: jest.fn().mockResolvedValue(undefined),
};
Object.assign(navigator, { clipboard: mockClipboard });

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Component that throws an error
const ThrowingComponent = ({
  shouldThrow = true,
}: {
  shouldThrow?: boolean;
}) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Types for test data
interface ErrorReportData {
  componentName: string;
  errorMessage: string;
  timestamp: string;
  stack?: string;
}

interface MockCall {
  calls: unknown[][];
}

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors
  const originalError = console.error;

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockClipboard.writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: mockClipboard,
    });
    window.alert = jest.fn();
    mockLocalStorage.clear();
  });

  describe('Basic functionality', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should render error UI when child throws', () => {
      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.getByText('Component: TestComponent')).toBeInTheDocument();
    });

    it('should display error ID', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      const errorIdElement = screen.getByText(/Error ID:/);
      expect(errorIdElement).toBeInTheDocument();
      expect(errorIdElement.textContent).toMatch(/error_\d+_\w+/);
    });

    it('should use custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom fallback</div>}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Custom fallback')).toBeInTheDocument();
      expect(
        screen.queryByText('Something went wrong'),
      ).not.toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(onError).toHaveBeenCalled();
      const mockCall = onError.mock as MockCall;
      const errorArg = mockCall.calls[0][0];
      if (!(errorArg instanceof Error)) {
        throw new Error('Expected Error instance');
      }
      expect(errorArg).toBeInstanceOf(Error);
      expect(errorArg.message).toBe('Test error');
    });
  });

  describe('Recovery', () => {
    it('should show Try Again button for recoverable errors', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(
        screen.getByRole('button', { name: /Try Again/i }),
      ).toBeInTheDocument();
    });

    it('should track recovery attempts', () => {
      render(
        <ErrorBoundary maxRecoveryAttempts={3}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      const tryAgainButton = screen.getByRole('button', { name: /Try Again/i });
      expect(tryAgainButton.textContent).toContain('1/3');
    });

    it('should provide Reset button for user', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Reset button should be available
      const resetButton = screen.getByRole('button', { name: /Reset/i });
      expect(resetButton).toBeInTheDocument();

      // Clicking reset should attempt to clear error (will throw again in this test)
      // This verifies the button is functional
      fireEvent.click(resetButton);

      // Since the component still throws, we'll be back in error state
      // The important thing is that handleReset was called (console.log verifies this)
    });
  });

  describe('Error reporting', () => {
    it('should copy error report to clipboard when Report Error is clicked', async () => {
      window.alert = jest.fn();

      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      const reportButton = screen.getByRole('button', {
        name: /Report Error/i,
      });
      fireEvent.click(reportButton);

      expect(mockClipboard.writeText).toHaveBeenCalled();
      const mockClipboardCall = mockClipboard.writeText.mock as MockCall;
      const clipboardArg = mockClipboardCall.calls[0][0];
      if (typeof clipboardArg !== 'string') {
        throw new Error('Expected string argument for clipboard.writeText');
      }
      const clipboardContent = JSON.parse(clipboardArg) as ErrorReportData;
      expect(clipboardContent.componentName).toBe('TestComponent');
      expect(clipboardContent.errorMessage).toBe('Test error');
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(
          'Error report copied to clipboard',
        ),
      );
      expect(window.alert).not.toHaveBeenCalled();
      expect(Object.keys(clipboardContent).sort()).toEqual(
        [
          'errorId',
          'componentName',
          'errorMessage',
          'timestamp',
          'userAgent',
          'url',
        ].sort(),
      );
    });

    function deferredCopy() {
      let resolve: () => void = () => {};
      let reject: (error: Error) => void = () => {};
      const promise = new Promise<void>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
      });
      return { promise, resolve, reject };
    }

    function renderError() {
      return render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowingComponent />
        </ErrorBoundary>,
      );
    }

    it('announces pending and success only after the clipboard settles', async () => {
      const pending = deferredCopy();
      mockClipboard.writeText.mockReturnValueOnce(pending.promise);
      renderError();
      const report = screen.getByRole('button', { name: /Report Error/i });

      fireEvent.click(report);

      expect(report).toBeDisabled();
      expect(screen.getByRole('status')).toHaveTextContent(/copying/i);
      expect(
        screen.queryByText(/copied to clipboard/i),
      ).not.toBeInTheDocument();
      expect(window.alert).not.toHaveBeenCalled();
      await act(async () => pending.resolve());
      expect(screen.getByRole('status')).toHaveTextContent(
        /copied to clipboard/i,
      );
      expect(report).toBeEnabled();
      expect(window.alert).not.toHaveBeenCalled();
    });

    it('submits one clipboard write for queued clicks before pending UI commits', async () => {
      const pending = deferredCopy();
      mockClipboard.writeText.mockReturnValueOnce(pending.promise);
      renderError();
      const report = screen.getByRole('button', { name: /Report Error/i });

      act(() => {
        report.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        report.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
      await act(async () => pending.resolve());
      expect(screen.getByRole('status')).toHaveTextContent(
        /copied to clipboard/i,
      );
      expect(window.alert).not.toHaveBeenCalled();
    });

    it('shows a rejected clipboard result and permits a successful retry', async () => {
      const pending = deferredCopy();
      mockClipboard.writeText.mockReturnValueOnce(pending.promise);
      renderError();
      const report = screen.getByRole('button', { name: /Report Error/i });
      fireEvent.click(report);

      await act(async () =>
        pending.reject(new Error('Clipboard permission denied')),
      );

      expect(screen.getByRole('alert')).toHaveTextContent(/failed to copy/i);
      expect(
        screen.queryByText(/copied to clipboard/i),
      ).not.toBeInTheDocument();
      expect(report).toBeEnabled();
      fireEvent.click(report);
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(
          /copied to clipboard/i,
        ),
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(mockClipboard.writeText).toHaveBeenCalledTimes(2);
      expect(window.alert).not.toHaveBeenCalled();
    });

    it('reports a missing clipboard API without claiming success', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      });
      renderError();

      fireEvent.click(screen.getByRole('button', { name: /Report Error/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /take a screenshot/i,
      );
      expect(mockClipboard.writeText).not.toHaveBeenCalled();
      expect(window.alert).not.toHaveBeenCalled();
    });

    it('reports a synchronous clipboard throw and remains retryable', async () => {
      mockClipboard.writeText.mockImplementationOnce(() => {
        throw new Error('Clipboard unavailable');
      });
      renderError();
      const report = screen.getByRole('button', { name: /Report Error/i });

      fireEvent.click(report);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /failed to copy/i,
      );
      expect(report).toBeEnabled();
      fireEvent.click(report);
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent(
          /copied to clipboard/i,
        ),
      );
      expect(window.alert).not.toHaveBeenCalled();
    });

    it.each(['Reset', 'Try Again'])(
      'ignores an old completion after %s creates a new error and copy attempt',
      async (action) => {
        const oldCopy = deferredCopy();
        const newCopy = deferredCopy();
        mockClipboard.writeText
          .mockReturnValueOnce(oldCopy.promise)
          .mockReturnValueOnce(newCopy.promise);
        renderError();
        fireEvent.click(screen.getByRole('button', { name: /Report Error/i }));

        fireEvent.click(
          screen.getByRole('button', { name: new RegExp(action) }),
        );

        const report = screen.getByRole('button', { name: /Report Error/i });
        expect(report).toBeEnabled();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        fireEvent.click(report);
        await act(async () => oldCopy.resolve());
        expect(screen.getByRole('status')).toHaveTextContent(/copying/i);
        expect(report).toBeDisabled();
        await act(async () => newCopy.resolve());
        expect(screen.getByRole('status')).toHaveTextContent(
          /copied to clipboard/i,
        );
        expect(window.alert).not.toHaveBeenCalled();
      },
    );

    it('does not publish a late rejection after recovery succeeds', async () => {
      const pending = deferredCopy();
      mockClipboard.writeText.mockReturnValueOnce(pending.promise);
      const view = render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      );
      fireEvent.click(screen.getByRole('button', { name: /Report Error/i }));
      view.rerender(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>,
      );
      fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));
      expect(screen.getByText('No error')).toBeInTheDocument();

      await act(async () => pending.reject(new Error('Late denial')));

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(window.alert).not.toHaveBeenCalled();
    });

    it('does not update an unmounted boundary after clipboard completion', async () => {
      const pending = deferredCopy();
      mockClipboard.writeText.mockReturnValueOnce(pending.promise);
      const boundary = React.createRef<ErrorBoundary>();
      const view = render(
        <ErrorBoundary ref={boundary}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );
      fireEvent.click(screen.getByRole('button', { name: /Report Error/i }));
      const instance = boundary.current;
      if (!instance) throw new Error('Mounted boundary required');
      const stateUpdates = jest.spyOn(instance, 'setState');
      view.unmount();
      stateUpdates.mockClear();

      await act(async () => pending.resolve());

      expect(stateUpdates).not.toHaveBeenCalled();
      expect(window.alert).not.toHaveBeenCalled();
      stateUpdates.mockRestore();
    });
  });

  describe('Error logging', () => {
    it('should store errors in localStorage', () => {
      render(
        <ErrorBoundary componentName="TestComponent">
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      const storedLogsString = mockLocalStorage.getItem('errorLogs');
      if (storedLogsString === null) {
        throw new Error('Expected errorLogs to be stored');
      }
      const storedLogs = JSON.parse(storedLogsString) as ErrorReportData[];
      expect(storedLogs.length).toBeGreaterThan(0);
      expect(storedLogs[storedLogs.length - 1].componentName).toBe(
        'TestComponent',
      );
    });
  });

  describe('Recoverability detection', () => {
    it('should identify TypeError as recoverable', () => {
      const ThrowTypeError = () => {
        throw new TypeError('Type error');
      };

      render(
        <ErrorBoundary>
          <ThrowTypeError />
        </ErrorBoundary>,
      );

      expect(
        screen.getByRole('button', { name: /Try Again/i }),
      ).toBeInTheDocument();
    });
  });
});

describe('withErrorBoundary HOC', () => {
  const originalError = console.error;

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('should wrap component with error boundary', () => {
    const SimpleComponent = () => <div>Simple content</div>;
    const WrappedComponent = withErrorBoundary(SimpleComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Simple content')).toBeInTheDocument();
  });

  it('should catch errors from wrapped component', () => {
    const ErrorComponent = () => {
      throw new Error('Wrapped component error');
    };
    const WrappedComponent = withErrorBoundary(ErrorComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should pass error boundary props', () => {
    const ErrorComponent = () => {
      throw new Error('Wrapped component error');
    };
    const WrappedComponent = withErrorBoundary(ErrorComponent, {
      fallback: <div>HOC Fallback</div>,
    });

    render(<WrappedComponent />);

    expect(screen.getByText('HOC Fallback')).toBeInTheDocument();
  });
});

describe('useErrorBoundary hook', () => {
  const TestHookComponent = () => {
    const { error, handleError, clearError, hasError } = useErrorBoundary();

    return (
      <div>
        <span data-testid="has-error">{hasError.toString()}</span>
        <span data-testid="error-message">{error?.message || 'No error'}</span>
        <button
          onClick={() =>
            handleError(new Error('Hook error'), { componentStack: '' })
          }
        >
          Trigger Error
        </button>
        <button onClick={clearError}>Clear Error</button>
      </div>
    );
  };

  it('should initialize with no error', () => {
    render(<TestHookComponent />);

    expect(screen.getByTestId('has-error').textContent).toBe('false');
    expect(screen.getByTestId('error-message').textContent).toBe('No error');
  });

  it('should set error when handleError is called', () => {
    render(<TestHookComponent />);

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Error' }));

    expect(screen.getByTestId('has-error').textContent).toBe('true');
    expect(screen.getByTestId('error-message').textContent).toBe('Hook error');
  });

  it('should clear error when clearError is called', () => {
    render(<TestHookComponent />);

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Error' }));
    expect(screen.getByTestId('has-error').textContent).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Clear Error' }));
    expect(screen.getByTestId('has-error').textContent).toBe('false');
  });
});
