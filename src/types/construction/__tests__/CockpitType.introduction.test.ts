import { TechBase } from '../../enums/TechBase';
import { CockpitType, getCockpitIntroductionYear } from '../CockpitType';

// MegaMek 48fcb2f64 Mek.java:3855-3871: Small Command Console shares the
// small cockpit progression: approximate IS prototype 3060, Clan 3080.
it('retains the separate Clan date for the new Small Command Console identity', () => {
  expect(
    getCockpitIntroductionYear(
      CockpitType.SMALL_COMMAND_CONSOLE,
      TechBase.INNER_SPHERE,
    ),
  ).toBe(3055);
  expect(
    getCockpitIntroductionYear(
      CockpitType.SMALL_COMMAND_CONSOLE,
      TechBase.CLAN,
    ),
  ).toBe(3080);
  expect(
    getCockpitIntroductionYear(
      CockpitType.SMALL_COMMAND_CONSOLE,
      TechBase.CLAN,
      true,
    ),
  ).toBe(3055);
});
