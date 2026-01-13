import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import CategoryNavigation from './CategoryNavigation';

const meta: Meta<typeof CategoryNavigation> = {
  title: 'Common/CategoryNavigation',
  component: CategoryNavigation,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A navigation component for filtering units by category. Fetches categories from the API and displays a selectable list.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-64 h-96 border border-gray-200 rounded">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CategoryNavigation>;

const mockCategories = [
  'BattleMech',
  'OmniMech',
  'IndustrialMech',
  'Vehicle',
  'Aerospace',
  'Infantry',
  'ProtoMech',
];

function MockCategoryNavigation({
  selectedCategory,
  onSelectCategory,
  categories = mockCategories,
  isLoading = false,
  error = null,
}: {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  categories?: string[];
  isLoading?: boolean;
  error?: string | null;
}) {
  if (isLoading) {
    return <div className="p-4">Loading categories...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <nav className="p-4 bg-gray-100 w-full h-full">
      <h3 className="text-lg font-semibold mb-2">Unit Categories</h3>
      <ul>
        <li key="all-categories" className="mb-1">
          <button
            onClick={() => onSelectCategory(null)}
            className={`w-full text-left px-2 py-1 rounded ${
              selectedCategory === null ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
            }`}
          >
            All Units
          </button>
        </li>
        {categories.map((category) => (
          <li key={category} className="mb-1">
            <button
              onClick={() => onSelectCategory(category)}
              className={`w-full text-left px-2 py-1 rounded ${
                selectedCategory === category ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function InteractiveCategoryNavigation(props: Partial<React.ComponentProps<typeof MockCategoryNavigation>>) {
  const [selected, setSelected] = useState<string | null>(props.selectedCategory ?? null);
  return (
    <MockCategoryNavigation
      {...props}
      selectedCategory={selected}
      onSelectCategory={setSelected}
    />
  );
}

export const Default: Story = {
  render: () => <InteractiveCategoryNavigation />,
};

export const WithSelection: Story = {
  render: () => <InteractiveCategoryNavigation selectedCategory="BattleMech" />,
};

export const AllUnitsSelected: Story = {
  render: () => <InteractiveCategoryNavigation selectedCategory={null} />,
};

export const Loading: Story = {
  render: () => (
    <MockCategoryNavigation
      selectedCategory={null}
      onSelectCategory={() => {}}
      isLoading={true}
    />
  ),
};

export const Error: Story = {
  render: () => (
    <MockCategoryNavigation
      selectedCategory={null}
      onSelectCategory={() => {}}
      error="Failed to fetch categories: Network Error"
    />
  ),
};

export const EmptyCategories: Story = {
  render: () => (
    <MockCategoryNavigation
      selectedCategory={null}
      onSelectCategory={() => {}}
      categories={[]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'When no categories are available, only the "All Units" option is shown.',
      },
    },
  },
};

export const MechsOnly: Story = {
  render: () => (
    <InteractiveCategoryNavigation
      categories={['Light Mech', 'Medium Mech', 'Heavy Mech', 'Assault Mech']}
    />
  ),
};

export const VehicleTypes: Story = {
  render: () => (
    <InteractiveCategoryNavigation
      categories={['Wheeled', 'Tracked', 'Hover', 'VTOL', 'Naval']}
    />
  ),
};

export const TechBase: Story = {
  render: () => (
    <InteractiveCategoryNavigation
      categories={['Inner Sphere', 'Clan', 'Mixed Tech', 'Primitive']}
    />
  ),
};

export const ManyCategories: Story = {
  render: () => (
    <InteractiveCategoryNavigation
      categories={[
        'BattleMech',
        'OmniMech',
        'IndustrialMech',
        'Light Vehicle',
        'Medium Vehicle',
        'Heavy Vehicle',
        'Assault Vehicle',
        'Conventional Fighter',
        'Aerospace Fighter',
        'Small Craft',
        'DropShip',
        'JumpShip',
        'WarShip',
        'Infantry',
        'Battle Armor',
        'ProtoMech',
      ]}
    />
  ),
  decorators: [
    (Story) => (
      <div className="w-64 h-[500px] border border-gray-200 rounded overflow-auto">
        <Story />
      </div>
    ),
  ],
};

export const WithContentPreview: Story = {
  render: () => {
    const [selected, setSelected] = useState<string | null>(null);
    
    const unitCounts: Record<string, number> = {
      BattleMech: 1247,
      OmniMech: 432,
      IndustrialMech: 89,
      Vehicle: 567,
      Aerospace: 234,
      Infantry: 156,
      ProtoMech: 78,
    };

    return (
      <div className="flex gap-4">
        <div className="w-64 h-96 border border-gray-200 rounded">
          <MockCategoryNavigation
            selectedCategory={selected}
            onSelectCategory={setSelected}
          />
        </div>
        <div className="flex-1 p-4 bg-surface-base rounded border border-border-theme-subtle">
          <h3 className="text-lg font-semibold mb-2">
            {selected ? `${selected} Units` : 'All Units'}
          </h3>
          <p className="text-text-theme-secondary">
            {selected
              ? `Showing ${unitCounts[selected] || 0} ${selected} units`
              : `Showing ${Object.values(unitCounts).reduce((a, b) => a + b, 0)} total units`}
          </p>
          <div className="mt-4 p-3 bg-surface-raised rounded">
            <span className="text-sm text-text-theme-muted">
              Selected filter: <strong>{selected || 'None (All)'}</strong>
            </span>
          </div>
        </div>
      </div>
    );
  },
  decorators: [
    (Story) => (
      <div className="w-full">
        <Story />
      </div>
    ),
  ],
};

export const WithCallback: Story = {
  render: () => {
    const [selected, setSelected] = useState<string | null>(null);
    const [log, setLog] = useState<string[]>([]);

    const handleSelect = (category: string | null) => {
      setSelected(category);
      setLog((prev) => [
        `${new Date().toLocaleTimeString()}: Selected "${category || 'All Units'}"`,
        ...prev.slice(0, 4),
      ]);
    };

    return (
      <div className="flex gap-4">
        <div className="w-64 h-96 border border-gray-200 rounded">
          <MockCategoryNavigation
            selectedCategory={selected}
            onSelectCategory={handleSelect}
          />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold mb-2">Selection Log</h4>
          <div className="p-3 bg-gray-100 rounded text-sm font-mono space-y-1">
            {log.length === 0 ? (
              <p className="text-gray-500">Click a category to see events...</p>
            ) : (
              log.map((entry, i) => <p key={i}>{entry}</p>)
            )}
          </div>
        </div>
      </div>
    );
  },
  decorators: [
    (Story) => (
      <div className="w-full">
        <Story />
      </div>
    ),
  ],
};
