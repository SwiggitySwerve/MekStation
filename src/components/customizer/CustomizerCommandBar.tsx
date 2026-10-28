import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** Keep unit actions in the application header while preserving their owner and callbacks. */
export function CustomizerCommandBar({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHost(document.getElementById('customizer-command-bar'));
  }, []);

  const content = (
    <div
      className="flex h-full min-w-0 flex-1 items-center"
      data-testid="customizer-unit-commands"
    >
      {children}
    </div>
  );
  return host ? createPortal(content, host) : content;
}
