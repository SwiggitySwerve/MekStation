import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { ToastConfig } from '../Toast';

import { toast, ToastProvider, useToast } from '../Toast';

function ToastTrigger({
  toast,
}: {
  toast: Omit<ToastConfig, 'id'>;
}): React.ReactElement {
  const { showToast } = useToast();

  return <button onClick={() => showToast(toast)}>Show toast</button>;
}

describe('shared ToastProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('places toasts in the top safe area instead of the bottom action area', () => {
    render(
      <ToastProvider>
        <ToastTrigger toast={{ message: 'Saved', variant: 'success' }} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show toast' }));

    const container = screen.getByTestId('toast-container');
    expect(container).toHaveClass(
      'top-[calc(4.25rem+env(safe-area-inset-top,0px))]',
    );
    expect(container).toHaveClass(
      'sm:top-[calc(4.75rem+env(safe-area-inset-top,0px))]',
    );
    expect(container).not.toHaveClass('bottom-4');
  });

  it('clears routine success toasts quickly by default', () => {
    render(
      <ToastProvider>
        <ToastTrigger
          toast={{ message: 'Campaign saved', variant: 'success' }}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show toast' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Campaign saved');

    act(() => {
      jest.advanceTimersByTime(1999);
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a repeated message once and restarts its timer', () => {
    render(
      <ToastProvider>
        <ToastTrigger
          toast={{ message: 'Draft saved in browser', variant: 'success' }}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show toast' }));
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Show toast' }));
    expect(screen.getAllByRole('alert')).toHaveLength(1);

    // The repeat's own 1800ms runs from the second click.
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Draft saved in browser',
    );
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('stacks different messages', () => {
    function TwoTriggers(): React.ReactElement {
      const { showToast } = useToast();
      return (
        <>
          <button
            onClick={() => showToast({ message: 'One', variant: 'info' })}
          >
            First
          </button>
          <button
            onClick={() => showToast({ message: 'Two', variant: 'info' })}
          >
            Second
          </button>
        </>
      );
    }
    render(
      <ToastProvider>
        <TwoTriggers />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'First' }));
    fireEvent.click(screen.getByRole('button', { name: 'Second' }));
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('routes standalone toast calls through the mounted provider', () => {
    render(<ToastProvider>Ready</ToastProvider>);

    act(() => {
      toast({ message: 'Movement is unavailable', variant: 'info' });
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Movement is unavailable',
    );
  });
});
