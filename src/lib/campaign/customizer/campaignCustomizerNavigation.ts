import type { NextRouter } from 'next/router';

export function navigateToCampaignCustomizerReturn(
  router: Pick<NextRouter, 'push'>,
  href: string,
): void {
  if (typeof window === 'undefined') {
    void router.push(href);
    return;
  }

  window.location.assign(href);
}
