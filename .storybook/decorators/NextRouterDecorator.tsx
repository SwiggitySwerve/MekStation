import React, { useEffect, ReactNode } from 'react';
import type { Decorator } from '@storybook/react';
import { setMockRouterPathname } from '../mocks/next-router';

interface MockRouterProviderProps {
  children: ReactNode;
  pathname?: string;
  query?: Record<string, string>;
}

export function MockRouterProvider({ 
  children, 
  pathname = '/',
  query = {},
}: MockRouterProviderProps): React.ReactElement {
  useEffect(() => {
    setMockRouterPathname(pathname, query);
  }, [pathname, query]);

  return <>{children}</>;
}

export const NextRouterDecorator: Decorator = (Story, context) => {
  const { nextRouter } = context.parameters || {};
  
  useEffect(() => {
    setMockRouterPathname(nextRouter?.pathname || '/', nextRouter?.query || {});
  }, [nextRouter?.pathname, nextRouter?.query]);
  
  return (
    <MockRouterProvider 
      pathname={nextRouter?.pathname || '/'}
      query={nextRouter?.query || {}}
    >
      <Story />
    </MockRouterProvider>
  );
};
