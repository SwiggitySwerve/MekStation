import type { Meta, StoryObj } from '@storybook/react';
import { CategoryToggleBar, HideToggleBar } from './CategoryToggleBar';
import { useState } from 'react';
import { EquipmentCategory } from '@/types/equipment';
import { fn } from '@storybook/test';

const meta: Meta<typeof CategoryToggleBar> = {
  title: 'Customizer/Equipment/CategoryToggleBar',
  component: CategoryToggleBar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Toggle button filters for equipment categories. Ctrl+click for multi-select.',
      },
    },
  },
  args: {
    onSelectCategory: fn(),
    onShowAll: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof CategoryToggleBar>;

function CategoryToggleBarDemo() {
  const [activeCategories, setActiveCategories] = useState<Set<EquipmentCategory>>(
    new Set([EquipmentCategory.ENERGY_WEAPON])
  );
  const [showAll, setShowAll] = useState(false);

  const handleSelectCategory = (category: EquipmentCategory, isMultiSelect: boolean) => {
    setShowAll(false);
    
    if (isMultiSelect) {
      const newSet = new Set(activeCategories);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      setActiveCategories(newSet);
    } else {
      setActiveCategories(new Set([category]));
    }
  };

  const handleShowAll = () => {
    setShowAll(true);
    setActiveCategories(new Set());
  };

  return (
    <div className="p-4 bg-slate-900 rounded">
      <CategoryToggleBar
        activeCategories={activeCategories}
        onSelectCategory={handleSelectCategory}
        onShowAll={handleShowAll}
        showAll={showAll}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <CategoryToggleBarDemo />,
};

export const ShowAll: Story = {
  args: {
    activeCategories: new Set(),
    showAll: true,
  },
  render: (args) => (
    <div className="p-4 bg-slate-900 rounded">
      <CategoryToggleBar {...args} />
    </div>
  ),
};

export const MultipleSelected: Story = {
  args: {
    activeCategories: new Set([
      EquipmentCategory.ENERGY_WEAPON,
      EquipmentCategory.MISSILE_WEAPON,
    ]),
    showAll: false,
  },
  render: (args) => (
    <div className="p-4 bg-slate-900 rounded">
      <CategoryToggleBar {...args} />
    </div>
  ),
};

function HideToggleBarDemo() {
  const [hidePrototype, setHidePrototype] = useState(false);
  const [hideOneShot, setHideOneShot] = useState(false);
  const [hideUnavailable, setHideUnavailable] = useState(true);
  const [hideAmmoWithoutWeapon, setHideAmmoWithoutWeapon] = useState(true);

  return (
    <div className="p-4 bg-slate-900 rounded">
      <HideToggleBar
        hidePrototype={hidePrototype}
        hideOneShot={hideOneShot}
        hideUnavailable={hideUnavailable}
        hideAmmoWithoutWeapon={hideAmmoWithoutWeapon}
        onTogglePrototype={() => setHidePrototype(!hidePrototype)}
        onToggleOneShot={() => setHideOneShot(!hideOneShot)}
        onToggleUnavailable={() => setHideUnavailable(!hideUnavailable)}
        onToggleAmmoWithoutWeapon={() => setHideAmmoWithoutWeapon(!hideAmmoWithoutWeapon)}
      />
    </div>
  );
}

export const HideFilters: Story = {
  render: () => <HideToggleBarDemo />,
  parameters: {
    docs: {
      description: {
        story: 'HideToggleBar component for hiding equipment types.',
      },
    },
  },
};

export const CombinedFilterBars: Story = {
  render: () => (
    <div className="p-4 bg-slate-900 rounded space-y-3">
      <CategoryToggleBarDemo />
      <HideToggleBarDemo />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Both filter bars together as they appear in the equipment browser.',
      },
    },
  },
};
