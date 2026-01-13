import type { Meta, StoryObj } from '@storybook/react';
import { useState, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Common/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A comprehensive error boundary component that catches JavaScript errors in child components, logs them, and displays a fallback UI with recovery options.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ErrorBoundary>;

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }): ReactNode {
  if (shouldThrow) {
    throw new Error('This is a simulated component error for testing');
  }
  return (
    <div className="p-4 bg-green-100 border border-green-300 rounded">
      <p className="text-green-800">Component rendered successfully!</p>
    </div>
  );
}

function ThrowOnClickComponent(): ReactNode {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('User triggered error via button click');
  }

  return (
    <div className="p-4 bg-blue-100 border border-blue-300 rounded space-y-3">
      <p className="text-blue-800">This component works until you click the button.</p>
      <button
        onClick={() => setShouldThrow(true)}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Trigger Error
      </button>
    </div>
  );
}

function createSpecificErrorComponent(errorType: 'syntax' | 'type' | 'reference' | 'custom'): () => ReactNode {
  return function SpecificError(): ReactNode {
    switch (errorType) {
      case 'syntax':
        throw new SyntaxError('Invalid JSON syntax encountered');
      case 'type':
        throw new TypeError('Cannot read property of undefined');
      case 'reference':
        throw new ReferenceError('Variable is not defined');
      case 'custom':
      default:
        throw new Error('Custom application error');
    }
  };
}

function WorkingComponent(): ReactNode {
  return (
    <div className="p-6 bg-surface-base border border-border-theme-subtle rounded-lg">
      <h3 className="text-lg font-semibold text-text-theme-primary mb-2">Mech Configuration</h3>
      <ul className="space-y-1 text-text-theme-secondary">
        <li>Chassis: Atlas AS7-D</li>
        <li>Tonnage: 100 tons</li>
        <li>Tech Base: Inner Sphere</li>
      </ul>
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <ErrorBoundary componentName="WorkingComponent">
      <WorkingComponent />
    </ErrorBoundary>
  ),
};

export const WithError: Story = {
  render: () => (
    <ErrorBoundary componentName="ThrowingComponent">
      <ThrowingComponent shouldThrow={true} />
    </ErrorBoundary>
  ),
};

export const InteractiveError: Story = {
  render: () => (
    <ErrorBoundary componentName="InteractiveComponent">
      <ThrowOnClickComponent />
    </ErrorBoundary>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Click the button to trigger an error and see the error boundary in action.',
      },
    },
  },
};

export const CustomFallback: Story = {
  render: () => (
    <ErrorBoundary
      componentName="CustomFallbackDemo"
      fallback={
        <div className="p-6 bg-amber-50 border-2 border-amber-400 rounded-lg text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <h3 className="text-lg font-bold text-amber-800 mb-2">Oops! Something went wrong</h3>
          <p className="text-amber-700">
            The mech configurator encountered an unexpected error.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
          >
            Reload Page
          </button>
        </div>
      }
    >
      <ThrowingComponent shouldThrow={true} />
    </ErrorBoundary>
  ),
};

export const WithErrorHandler: Story = {
  render: () => {
    const handleError = (error: Error) => {
      console.log('Error logged to external service:', {
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    };

    return (
      <ErrorBoundary
        componentName="ErrorHandlerDemo"
        onError={handleError}
      >
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Check the console to see the error being logged via the onError callback.',
      },
    },
  },
};

export const MaxRecoveryAttempts: Story = {
  render: () => (
    <ErrorBoundary
      componentName="RecoveryDemo"
      maxRecoveryAttempts={5}
    >
      <ThrowingComponent shouldThrow={true} />
    </ErrorBoundary>
  ),
  parameters: {
    docs: {
      description: {
        story: 'This error boundary allows 5 recovery attempts before disabling the retry button.',
      },
    },
  },
};

export const SingleRetry: Story = {
  render: () => (
    <ErrorBoundary
      componentName="SingleRetryDemo"
      maxRecoveryAttempts={1}
    >
      <ThrowingComponent shouldThrow={true} />
    </ErrorBoundary>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Only 1 recovery attempt allowed.',
      },
    },
  },
};

export const NestedBoundaries: Story = {
  render: () => (
    <div className="space-y-4">
      <ErrorBoundary componentName="OuterBoundary">
        <div className="p-4 border border-gray-300 rounded space-y-4">
          <h3 className="font-semibold">Parent Component</h3>
          <div className="grid grid-cols-2 gap-4">
            <ErrorBoundary componentName="LeftChild">
              <WorkingComponent />
            </ErrorBoundary>
            <ErrorBoundary componentName="RightChild">
              <ThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Nested error boundaries isolate failures. The left component continues working even when the right one fails.',
      },
    },
  },
};

const SyntaxErrorComponent = createSpecificErrorComponent('syntax');
const TypeErrorComponent = createSpecificErrorComponent('type');
const ReferenceErrorComponent = createSpecificErrorComponent('reference');

export const SyntaxErrorDemo: Story = {
  render: () => (
    <ErrorBoundary componentName="SyntaxErrorDemo">
      <SyntaxErrorComponent />
    </ErrorBoundary>
  ),
  parameters: {
    docs: {
      description: {
        story: 'SyntaxError is marked as non-recoverable, so the retry button is disabled.',
      },
    },
  },
};

export const TypeErrorDemo: Story = {
  render: () => (
    <ErrorBoundary componentName="TypeErrorDemo">
      <TypeErrorComponent />
    </ErrorBoundary>
  ),
};

export const ReferenceErrorDemo: Story = {
  render: () => (
    <ErrorBoundary componentName="ReferenceErrorDemo">
      <ReferenceErrorComponent />
    </ErrorBoundary>
  ),
};

export const MechConfiguratorError: Story = {
  render: () => {
    const MechConfigurator = (): ReactNode => {
      const [loadData, setLoadData] = useState(false);
      
      if (loadData) {
        throw new Error('Failed to load mech configuration from server');
      }

      return (
        <div className="p-6 bg-surface-base rounded-lg space-y-4">
          <h2 className="text-xl font-bold text-text-theme-primary">Mech Configurator</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-surface-raised rounded">
              <span className="text-text-theme-secondary">Chassis</span>
              <p className="font-semibold">Atlas AS7-D</p>
            </div>
            <div className="p-3 bg-surface-raised rounded">
              <span className="text-text-theme-secondary">Tonnage</span>
              <p className="font-semibold">100 tons</p>
            </div>
          </div>
          <button
            onClick={() => setLoadData(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Load Remote Config (Will Fail)
          </button>
        </div>
      );
    };

    return (
      <ErrorBoundary
        componentName="MechConfigurator"
        onError={(error) => {
          console.error('Mech Configurator Error:', error.message);
        }}
      >
        <MechConfigurator />
      </ErrorBoundary>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'A realistic example showing how the error boundary would wrap a mech configurator component.',
      },
    },
  },
};
