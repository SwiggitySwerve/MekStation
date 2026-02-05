import React, { createContext, useContext } from 'react';

interface RouterContextValue {
  pathname: string;
  query: Record<string, string>;
  asPath: string;
}

const RouterContext = createContext<RouterContextValue>({
  pathname: '/',
  query: {},
  asPath: '/',
});

export function setMockRouterPathname(
  pathname: string,
  query: Record<string, string> = {},
) {
  (globalThis as Record<string, unknown>).__STORYBOOK_ROUTER_PATHNAME__ =
    pathname;
  (globalThis as Record<string, unknown>).__STORYBOOK_ROUTER_QUERY__ = query;
}

function getPathname(): string {
  return (
    ((globalThis as Record<string, unknown>)
      .__STORYBOOK_ROUTER_PATHNAME__ as string) || '/'
  );
}

function getQuery(): Record<string, string> {
  return (
    ((globalThis as Record<string, unknown>)
      .__STORYBOOK_ROUTER_QUERY__ as Record<string, string>) || {}
  );
}

export function useRouter() {
  const pathname = getPathname();
  const query = getQuery();

  return {
    pathname,
    query,
    asPath:
      pathname +
      (Object.keys(query).length > 0
        ? '?' + new URLSearchParams(query).toString()
        : ''),
    push: (url: string) => {
      console.log('[Storybook Router] push:', url);
      return Promise.resolve(true);
    },
    replace: (url: string) => {
      console.log('[Storybook Router] replace:', url);
      return Promise.resolve(true);
    },
    back: () => console.log('[Storybook Router] back'),
    forward: () => console.log('[Storybook Router] forward'),
    prefetch: () => Promise.resolve(),
    reload: () => console.log('[Storybook Router] reload'),
    events: {
      on: () => {},
      off: () => {},
      emit: () => {},
    },
    isFallback: false,
    isReady: true,
    isPreview: false,
  };
}

export function usePathname(): string {
  return getPathname();
}

export function useSearchParams() {
  const query = getQuery();
  return new URLSearchParams(query);
}

export function useParams() {
  return getQuery();
}

export function redirect(url: string): never {
  console.log('[Storybook Router] redirect:', url);
  throw new Error('NEXT_REDIRECT');
}

export function notFound(): never {
  console.log('[Storybook Router] notFound');
  throw new Error('NEXT_NOT_FOUND');
}

export { RouterContext };
