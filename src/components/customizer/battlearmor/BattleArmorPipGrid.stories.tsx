import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { useMemo } from 'react';

import {
  BattleArmorStoreContext,
  createNewBattleArmorStore,
} from '@/stores/useBattleArmorStore';
import { BattleArmorWeightClass } from '@/types/unit/PersonnelInterfaces';

import { BattleArmorPipGrid } from './BattleArmorPipGrid';

/**
 * Wrap a story in a BattleArmorStoreContext provider. The pip grid reads the
 * squad entirely from the store; each story creates its own store and may
 * seed `armorPerTrooper` (not a create-option) through the seed callback.
 */
function withBattleArmorStore(
  options: Parameters<typeof createNewBattleArmorStore>[0],
  seed?: (store: ReturnType<typeof createNewBattleArmorStore>) => void,
): Decorator {
  return function BattleArmorStoreDecorator(Story) {
    const store = useMemo(() => {
      const s = createNewBattleArmorStore(options);
      seed?.(s);
      return s;
    }, []);
    return (
      <BattleArmorStoreContext.Provider value={store}>
        <Story />
      </BattleArmorStoreContext.Provider>
    );
  };
}

const meta: Meta<typeof BattleArmorPipGrid> = {
  title: 'Customizer/Armor/BattleArmorPipGrid',
  component: BattleArmorPipGrid,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof BattleArmorPipGrid>;

/** PA(L) — 3 pips per trooper at full weight-class allocation. */
export const PaLight: Story = {
  decorators: [
    withBattleArmorStore(
      { weightClass: BattleArmorWeightClass.PA_L, squadSize: 4 },
      (store) => store.setState({ armorPerTrooper: 3 }),
    ),
  ],
};

/** Light — 5 pips per trooper. */
export const Light: Story = {
  decorators: [
    withBattleArmorStore(
      { weightClass: BattleArmorWeightClass.LIGHT, squadSize: 4 },
      (store) => store.setState({ armorPerTrooper: 5 }),
    ),
  ],
};

/** Medium — 7 pips per trooper. */
export const Medium: Story = {
  decorators: [
    withBattleArmorStore(
      { weightClass: BattleArmorWeightClass.MEDIUM, squadSize: 4 },
      (store) => store.setState({ armorPerTrooper: 7 }),
    ),
  ],
};

/** Heavy — 11 pips per trooper. */
export const Heavy: Story = {
  decorators: [
    withBattleArmorStore(
      { weightClass: BattleArmorWeightClass.HEAVY, squadSize: 4 },
      (store) => store.setState({ armorPerTrooper: 11 }),
    ),
  ],
};

/** Assault — 15 pips per trooper, 5-trooper squad. */
export const Assault: Story = {
  decorators: [
    withBattleArmorStore(
      { weightClass: BattleArmorWeightClass.ASSAULT, squadSize: 5 },
      (store) => store.setState({ armorPerTrooper: 15 }),
    ),
  ],
};

/**
 * Allocation above the weight-class cap — armorPerTrooper is authoritative, so
 * a Light suit allocated 10 renders 10 pips (not clamped to the class max of 5).
 */
export const AboveClassAllocation: Story = {
  decorators: [
    withBattleArmorStore(
      { weightClass: BattleArmorWeightClass.LIGHT, squadSize: 4 },
      (store) => store.setState({ armorPerTrooper: 10 }),
    ),
  ],
};

/**
 * Allocation below the weight-class cap — a Heavy suit allocated 4 renders 4
 * pips, reflecting the player's actual allocation rather than the class max.
 */
export const BelowClassAllocation: Story = {
  decorators: [
    withBattleArmorStore(
      { weightClass: BattleArmorWeightClass.HEAVY, squadSize: 4 },
      (store) => store.setState({ armorPerTrooper: 4 }),
    ),
  ],
};

/**
 * Legacy fallback — when armorPerTrooper is unset the grid falls back to the
 * weight-class maximum (Heavy → 11 pips).
 */
export const WeightClassFallback: Story = {
  decorators: [
    withBattleArmorStore(
      { weightClass: BattleArmorWeightClass.HEAVY, squadSize: 4 },
      (store) => store.setState({ armorPerTrooper: undefined }),
    ),
  ],
};
