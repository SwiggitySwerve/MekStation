import { render, screen, within } from '@testing-library/react';

import { GamePhase, GameSide } from '@/types/gameplay';
import { createPSRTriggeredEvent } from '@/utils/gameplay/gameEvents/statusChecksPsr';
import { appendEvent, createGameSession } from '@/utils/gameplay/gameSession';
import { createSwampBogDownPSR } from '@/utils/gameplay/pilotingSkillRolls';
import { projectPsrTriggerTarget } from '@/utils/gameplay/pilotingSkillRolls/eventTargets';

import { RecordSheetDisplay } from '../RecordSheetDisplay';

it('shows the pending deep-swamp check as automatic failure on the live or recovered record sheet', () => {
  // STATED intent: Root's 2026-11-11 pending-PSR representation ruling.
  let session = createGameSession(
    { mapRadius: 7, turnLimit: 5, victoryConditions: [], optionalRules: [] },
    [
      {
        id: 'mek',
        name: 'Atlas',
        unitRef: 'atlas-as7-d',
        pilotRef: 'Regular',
        side: GameSide.Player,
        gunnery: 4,
        piloting: 5,
      },
    ],
  );
  const psr = createSwampBogDownPSR('mek', 0, { swampDepth: 2 });
  session = appendEvent(
    session,
    createPSRTriggeredEvent({
      gameId: session.id,
      sequence: session.events.length,
      turn: 1,
      phase: GamePhase.Movement,
      unitId: 'mek',
      reason: psr.reason,
      reasonCode: psr.reasonCode,
      triggerSource: psr.triggerSource,
      additionalModifier: psr.additionalModifier,
      ...projectPsrTriggerTarget(psr),
    }),
  );
  const view = render(
    <RecordSheetDisplay
      unitName="Atlas"
      designation="AS7-D"
      state={session.currentState.units.mek}
      maxArmor={{}}
      maxStructure={{}}
      weapons={[]}
      pilotName="Regular"
      gunnery={4}
      piloting={5}
      heatSinks={10}
    />,
  );
  const pending = screen.getByRole('region', {
    name: 'Pending piloting checks',
  });
  expect(
    within(pending).getByText('Avoid bogging down: automatic failure'),
  ).toBeVisible();
  for (const forbidden of ['undefined', 'NaN', 'Infinity'])
    expect(pending).not.toHaveTextContent(forbidden);
  view.rerender(
    <RecordSheetDisplay
      unitName="Atlas"
      designation="AS7-D"
      state={{ ...session.currentState.units.mek, pendingPSRs: [] }}
      maxArmor={{}}
      maxStructure={{}}
      weapons={[]}
      pilotName="Regular"
      gunnery={4}
      piloting={5}
      heatSinks={10}
    />,
  );
  expect(
    screen.queryByRole('region', { name: 'Pending piloting checks' }),
  ).toBeNull();
});
