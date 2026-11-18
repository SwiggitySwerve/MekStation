/**
 * Render counters for the play-page perf probe (perf P2).
 *
 * `counted` wraps a function component (or a `React.memo` of one) so every
 * real execution of its body bumps a named counter. A memo keeps its compare,
 * so a bailed-out memo row is not counted. Lives in its own module so
 * `jest.mock` factories can load it with `jest.requireActual`.
 */
import React from 'react';

const MEMO_TYPE = Symbol.for('react.memo');

export const renderCounts: Record<string, number> = {};

export function resetRenderCounts(): void {
  for (const key of Object.keys(renderCounts)) renderCounts[key] = 0;
}

type AnyComponent = (props: never) => React.ReactNode;

interface MemoLike {
  readonly $$typeof: symbol;
  readonly type: AnyComponent;
  readonly compare: ((a: never, b: never) => boolean) | null;
}

export function counted<T>(name: string, component: T): T {
  renderCounts[name] = 0;
  const memo = component as unknown as MemoLike;
  if (memo && memo.$$typeof === MEMO_TYPE) {
    return React.memo(
      counted(name, memo.type) as never,
      memo.compare ?? undefined,
    ) as unknown as T;
  }
  const render = component as unknown as AnyComponent;
  function Counted(props: never): React.ReactNode {
    renderCounts[name] += 1;
    return render(props);
  }
  Counted.displayName = `Counted(${name})`;
  return Counted as unknown as T;
}
