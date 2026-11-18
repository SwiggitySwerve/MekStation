import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  modeAvailability,
  isModeLaunchDisabled,
  type MultiplayerMode,
} from '@/lib/multiplayer/modeAvailability';

const documents = [
  'README.md',
  'docs/features/gm-two-player-campaign.md',
  'docs/releases/v2.2.0-topology.md',
];

describe('multiplayer availability owner and documentation contract', () => {
  it('only disables peer-to-peer launch', () => {
    expect(isModeLaunchDisabled('hosted')).toBe(false);
    expect(isModeLaunchDisabled('coop')).toBe(false);
    expect(isModeLaunchDisabled('p2p')).toBe(true);
  });

  it.each(documents)(
    '%s discloses every unavailable mode verbatim and omits available blocks',
    (file) => {
      const text = readFileSync(path.join(process.cwd(), file), 'utf8');
      for (const mode of Object.keys(modeAvailability) as MultiplayerMode[]) {
        const entry = modeAvailability[mode];
        const block = text.match(
          new RegExp(
            `<!-- multiplayer:${mode}:start -->([\\s\\S]*?)<!-- multiplayer:${mode}:end -->`,
          ),
        );
        if (entry.status === 'available') {
          expect(block).toBeNull();
        } else {
          expect(block?.[1]).toContain(entry.sentence);
          expect(block?.[1]).toContain(entry.label);
        }
      }
    },
  );
});
