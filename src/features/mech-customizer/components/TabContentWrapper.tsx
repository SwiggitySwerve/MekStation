'use client';

import React from 'react';

interface TabContentWrapperProps {
  children: React.ReactNode;
}

export const TabContentWrapper: React.FC<TabContentWrapperProps> = ({ children }) => (
  <section className="flex-1 overflow-y-auto bg-[var(--surface-base)]">
    <div className="p-6 space-y-6">{children}</div>
  </section>
);

