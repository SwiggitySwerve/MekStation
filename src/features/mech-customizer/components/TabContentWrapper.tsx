'use client';

import React from 'react';

interface TabContentWrapperProps {
  children: React.ReactNode;
}

export const TabContentWrapper: React.FC<TabContentWrapperProps> = ({ children }) => (
  <section className="flex-1 overflow-y-auto bg-slate-900">
    <div className="p-6">{children}</div>
  </section>
);

