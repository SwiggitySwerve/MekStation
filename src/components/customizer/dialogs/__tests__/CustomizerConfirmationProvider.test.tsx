import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import React, { useLayoutEffect, useRef, useState } from 'react';

import {
  CustomizerConfirmationProvider,
  useCustomizerConfirmation,
} from '../CustomizerConfirmationProvider';
import { ModalOverlay } from '../ModalOverlay';

const mockApproveHandlers: Array<() => void> = [];
const mockCancelHandlers: Array<() => void> = [];

jest.mock('@/components/ui/Button', () => {
  const actual = jest.requireActual('@/components/ui/Button');
  return {
    ...actual,
    Button: (
      props: React.ComponentProps<
        typeof import('@/components/ui/Button').Button
      >,
    ) => {
      if (props.onClick) {
        const deliver = () => Reflect.apply(props.onClick!, undefined, []);
        if (props.children === 'Confirm') mockApproveHandlers.push(deliver);
        if (props.children === 'Cancel') mockCancelHandlers.push(deliver);
      }
      return <actual.Button {...props} />;
    },
  };
});

const scope = { unitId: 'unit-a', unitType: 'BattleMech' };
type RequestAction = (title?: string) => boolean;

function Caller({
  value = 1,
  onCommit,
  expose,
}: {
  value?: number;
  onCommit: () => void;
  expose?: (request: RequestAction) => void;
}) {
  const { requestConfirmation } = useCustomizerConfirmation();
  const currentValue = useRef(value);
  useLayoutEffect(() => {
    currentValue.current = value;
  }, [value]);
  const request: RequestAction = (title = 'Confirm action') => {
    const snapshot = currentValue.current;
    return requestConfirmation({
      title,
      message: 'Apply the current action?',
      isCurrent: () => currentValue.current === snapshot,
      onConfirm: onCommit,
    });
  };
  useLayoutEffect(() => {
    expose?.(request);
  });
  return <button onClick={() => request()}>Request action</button>;
}

function Sentinel() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>Controller {count}</button>
  );
}

describe('Customizer confirmation public interaction', () => {
  const originalShow = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  );
  const originalClose = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'close',
  );

  beforeAll(() => {
    // Limited DOM lifecycle fixture; browser inertness/top-layer geometry are not simulated.
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
        this.querySelector<HTMLElement>('button')?.focus();
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      },
    });
  });
  afterAll(() => {
    for (const [key, descriptor] of [
      ['showModal', originalShow],
      ['close', originalClose],
    ] as const) {
      if (descriptor)
        Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
    }
  });
  beforeEach(() => {
    mockApproveHandlers.length = 0;
    mockCancelHandlers.length = 0;
    jest.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue({
      length: 1,
      item: () => new DOMRect(0, 0, 10, 10),
      0: new DOMRect(0, 0, 10, 10),
    } as unknown as DOMRectList);
  });
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('shows the real named native app dialog and approves once', () => {
    const commit = jest.fn();
    render(
      <CustomizerConfirmationProvider scope={scope}>
        <Caller onCommit={commit} />
      </CustomizerConfirmationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Request action' }));
    expect(screen.getByRole('dialog', { name: 'Confirm action' }).tagName).toBe(
      'DIALOG',
    );
    const queuedApprove = mockApproveHandlers.at(-1)!;
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    act(() => queuedApprove());
    expect(commit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('rejects a second pending request without replacing the displayed one', () => {
    const commit = jest.fn();
    let request!: RequestAction;
    render(
      <CustomizerConfirmationProvider scope={scope}>
        <Caller
          onCommit={commit}
          expose={(action) => {
            request = action;
          }}
        />
      </CustomizerConfirmationProvider>,
    );
    act(() => expect(request('First request')).toBe(true));
    act(() => expect(request('Second request')).toBe(false));
    expect(
      screen.getByRole('dialog', { name: 'First request' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(commit).not.toHaveBeenCalled();
  });

  it('clears admission before a synchronous callback can deliver a duplicate or request again', () => {
    let request!: RequestAction;
    let oldApprove!: () => void;
    let callbackCount = 0;
    const commit = jest.fn(() => {
      callbackCount += 1;
      if (callbackCount === 1) oldApprove();
      expect(request('Follow-up request')).toBe(true);
    });
    render(
      <CustomizerConfirmationProvider scope={scope}>
        <Caller
          onCommit={commit}
          expose={(action) => {
            request = action;
          }}
        />
      </CustomizerConfirmationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Request action' }));
    oldApprove = mockApproveHandlers.at(-1)!;
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('dialog', { name: 'Follow-up request' }),
    ).toBeInTheDocument();
  });

  it.each([
    { unitId: 'unit-b', unitType: 'BattleMech' },
    { unitId: 'unit-a', unitType: 'Vehicle' },
  ])(
    'invalidates rendered scope while preserving controller state: %s',
    (nextScope) => {
      const commit = jest.fn();
      const content = (
        <>
          <Sentinel />
          <Caller onCommit={commit} />
        </>
      );
      const view = render(
        <CustomizerConfirmationProvider scope={scope}>
          {content}
        </CustomizerConfirmationProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Controller 0' }));
      fireEvent.click(screen.getByRole('button', { name: 'Request action' }));
      const oldApprove = mockApproveHandlers.at(-1)!;
      view.rerender(
        <CustomizerConfirmationProvider scope={nextScope}>
          {content}
        </CustomizerConfirmationProvider>,
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Controller 1' }),
      ).toBeInTheDocument();
      act(() => oldApprove());
      expect(commit).not.toHaveBeenCalled();
    },
  );

  it('caller-only unmount on the same unit cancels and refuses later requests', () => {
    const commit = jest.fn();
    let request!: RequestAction;
    const view = render(
      <CustomizerConfirmationProvider scope={scope}>
        <Caller
          onCommit={commit}
          expose={(action) => {
            request = action;
          }}
        />
      </CustomizerConfirmationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Request action' }));
    const oldApprove = mockApproveHandlers.at(-1)!;
    view.rerender(
      <CustomizerConfirmationProvider scope={scope}>
        <Sentinel />
      </CustomizerConfirmationProvider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => {
      oldApprove();
      expect(request()).toBe(false);
    });
    expect(commit).not.toHaveBeenCalled();
  });

  it('same-unit full-screen mobile parent disappearance disposes the child request', () => {
    const commit = jest.fn();
    const view = render(
      <CustomizerConfirmationProvider scope={scope}>
        <ModalOverlay
          fullScreen
          isOpen
          onClose={jest.fn()}
          ariaLabelledBy="mobile-title"
        >
          <h2 id="mobile-title">Mobile loadout</h2>
          <Caller onCommit={commit} />
        </ModalOverlay>
      </CustomizerConfirmationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Request action' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    const oldApprove = mockApproveHandlers.at(-1)!;
    view.rerender(
      <CustomizerConfirmationProvider scope={scope}>
        <Sentinel />
      </CustomizerConfirmationProvider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => oldApprove());
    expect(commit).not.toHaveBeenCalled();
  });

  it('replacement caller and old displayed handlers cannot consume a newer request', () => {
    const commit = jest.fn();
    const view = render(
      <CustomizerConfirmationProvider scope={scope}>
        <Caller key="first" onCommit={commit} />
      </CustomizerConfirmationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Request action' }));
    const oldApprove = mockApproveHandlers.at(-1)!;
    const oldCancel = mockCancelHandlers.at(-1)!;
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    view.rerender(
      <CustomizerConfirmationProvider scope={scope}>
        <Caller key="second" onCommit={commit} />
      </CustomizerConfirmationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Request action' }));
    act(() => {
      oldCancel();
      oldApprove();
    });
    expect(
      screen.getByRole('dialog', { name: 'Confirm action' }),
    ).toBeInTheDocument();
    expect(commit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('same-unit caller replacement cancels an outstanding request before accepting a new one', () => {
    const commit = jest.fn();
    const view = render(
      <CustomizerConfirmationProvider scope={scope}>
        <Caller key="old" onCommit={commit} />
      </CustomizerConfirmationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Request action' }));
    const oldApprove = mockApproveHandlers.at(-1)!;
    view.rerender(
      <CustomizerConfirmationProvider scope={scope}>
        <Caller key="new" onCommit={commit} />
      </CustomizerConfirmationProvider>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Request action' }));
    act(() => oldApprove());
    expect(commit).not.toHaveBeenCalled();
    expect(
      screen.getByRole('dialog', { name: 'Confirm action' }),
    ).toBeInTheDocument();
  });

  it('synchronously refuses changed current inputs but accepts equal semantic rerenders', () => {
    const commit = jest.fn();
    const view = render(
      <CustomizerConfirmationProvider scope={{ ...scope }}>
        <Caller value={1} onCommit={commit} />
      </CustomizerConfirmationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Request action' }));
    view.rerender(
      <CustomizerConfirmationProvider scope={{ ...scope }}>
        <Caller value={2} onCommit={commit} />
      </CustomizerConfirmationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(commit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Request action' }));
    view.rerender(
      <CustomizerConfirmationProvider scope={{ ...scope }}>
        <Caller value={2} onCommit={commit} />
      </CustomizerConfirmationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('provider unmount refuses a queued displayed handler and old caller', () => {
    const commit = jest.fn();
    let request!: RequestAction;
    const view = render(
      <CustomizerConfirmationProvider scope={scope}>
        <Caller
          onCommit={commit}
          expose={(action) => {
            request = action;
          }}
        />
      </CustomizerConfirmationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Request action' }));
    const queuedApprove = mockApproveHandlers.at(-1)!;
    view.unmount();
    act(() => {
      queuedApprove();
      expect(request()).toBe(false);
    });
    expect(commit).not.toHaveBeenCalled();
  });

  it('standalone hook renders normally and fails clearly only when requesting', () => {
    const { result } = renderHook(() => useCustomizerConfirmation());
    expect(typeof result.current.requestConfirmation).toBe('function');
    expect(() =>
      result.current.requestConfirmation({
        title: 'Confirm action',
        message: 'Apply?',
        isCurrent: () => true,
        onConfirm: jest.fn(),
      }),
    ).toThrow('CustomizerConfirmationProvider');
  });
});
