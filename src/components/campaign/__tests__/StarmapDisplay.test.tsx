import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { StarmapDisplay } from '../StarmapDisplay';

jest.mock('react-konva', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  type MockStageProps = {
    readonly width: number;
    readonly height: number;
    readonly children?: import('react').ReactNode;
  };

  type MockKonvaNodeProps = {
    readonly children?: import('react').ReactNode;
  };

  const Stage = ({
    width,
    height,
    children,
  }: MockStageProps): import('react').ReactElement =>
    React.createElement(
      'div',
      {
        'data-testid': 'mock-stage',
        'data-width': width,
        'data-height': height,
      },
      children,
    );

  const KonvaNode = ({
    children,
  }: MockKonvaNodeProps): import('react').ReactElement =>
    React.createElement('div', null, children);

  return {
    __esModule: true,
    Stage,
    Layer: KonvaNode,
    Group: KonvaNode,
    Circle: KonvaNode,
    Label: KonvaNode,
    Ring: KonvaNode,
    Tag: KonvaNode,
    Text: KonvaNode,
  };
});

const originalResizeObserver = globalThis.ResizeObserver;
const originalClientWidthDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'clientWidth',
);
const originalClientHeightDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'clientHeight',
);

let clientWidth = 0;
let clientHeight = 0;
let resizeObserverCallback: ResizeObserverCallback | null = null;
let resizeObserverInstance: ResizeObserver | null = null;

class CapturingResizeObserver implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = callback;
    resizeObserverInstance = this;
  }

  observe(_target: Element, _options?: ResizeObserverOptions): void {}

  unobserve(_target: Element): void {}

  disconnect(): void {}
}

function restoreProperty(
  target: HTMLElement,
  propertyName: 'clientWidth' | 'clientHeight',
  descriptor: PropertyDescriptor | undefined,
): void {
  if (descriptor) {
    Object.defineProperty(target, propertyName, descriptor);
    return;
  }

  delete (target as { clientWidth?: number; clientHeight?: number })[
    propertyName
  ];
}

beforeAll(() => {
  globalThis.ResizeObserver = CapturingResizeObserver;
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => clientWidth,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => clientHeight,
  });
});

beforeEach(() => {
  clientWidth = 0;
  clientHeight = 0;
  resizeObserverCallback = null;
  resizeObserverInstance = null;
});

afterAll(() => {
  globalThis.ResizeObserver = originalResizeObserver;
  restoreProperty(
    HTMLElement.prototype,
    'clientWidth',
    originalClientWidthDescriptor,
  );
  restoreProperty(
    HTMLElement.prototype,
    'clientHeight',
    originalClientHeightDescriptor,
  );
});

function fireResizeObserver(): void {
  const callback = resizeObserverCallback;
  const observer = resizeObserverInstance;
  if (!callback || !observer) {
    throw new Error('ResizeObserver callback was not captured');
  }

  act(() => {
    callback([], observer);
  });
}

describe('StarmapDisplay', () => {
  it('does not mount the stage when the container first measures 0x0', () => {
    expect(() => {
      render(<StarmapDisplay systems={[]} />);
    }).not.toThrow();

    expect(screen.queryByTestId('mock-stage')).not.toBeInTheDocument();
  });

  it('mounts the stage at the first valid ResizeObserver measurement', () => {
    render(<StarmapDisplay systems={[]} />);
    expect(screen.queryByTestId('mock-stage')).not.toBeInTheDocument();

    clientWidth = 1200;
    clientHeight = 700;
    fireResizeObserver();

    const stage = screen.getByTestId('mock-stage');
    expect(stage).toHaveAttribute('data-width', '1200');
    expect(stage).toHaveAttribute('data-height', '700');
  });
});
