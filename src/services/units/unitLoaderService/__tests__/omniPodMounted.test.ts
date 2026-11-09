import { parseCriticalSlotToken } from '../equipmentResolution';

// Preserve sourceWeaponMounts' existing observation while consolidating ownership.
it.each([
  ['ISMediumLaser (OMNIPOD)', true],
  ['ISMediumLaser (omnipod) (ARMORED)', true],
  ['ISMediumLaser', false],
])('exposes the existing source pod flag for %s', (token, pod) => {
  expect(parseCriticalSlotToken(token)).toHaveProperty('isOmniPodMounted', pod);
});
