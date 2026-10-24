import React from 'react';

/**
 * RED-stage stubs (LSC-2): inert exports so the component tests fail on
 * assertions rather than on a missing module. The GREEN commit replaces this
 * file with the real chooser and renewal components.
 */
export function LocalSeatCredentialPanel(): React.ReactElement | null {
  return null;
}

export function CoopCredentialRenewal(_props: {
  matchId?: string;
  reloadPage?: () => void;
  navigatePage?: (href: string) => void;
}): React.ReactElement | null {
  return null;
}
