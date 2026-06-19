import { expectUnresolvedInventoryClosedAfterLeafClosure } from './combatValidationCatalog.test-helpers';

it('keeps the unresolved helper and unsupported inventory empty after leaf closure', () => {
  expectUnresolvedInventoryClosedAfterLeafClosure();
});
