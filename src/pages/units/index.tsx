import React, { useState } from 'react';
import UnitList from '../../components/units/UnitList';
import CategoryNavigation from '../../components/common/CategoryNavigation';

const UnitsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleSelectCategory = (category: string | null) => {
    setSelectedCategory(category);
  };

  const unitPageSidebar = (
    <CategoryNavigation
      selectedCategory={selectedCategory}
      onSelectCategory={handleSelectCategory}
    />
  );

  return (
    <div className="flex">
      {/* Category Navigation Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 print:hidden">
        {unitPageSidebar}
      </aside>
      
      {/* Main Content */}
      <div className="flex-grow">
        <div className="pt-16 md:pt-0 p-4 sm:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 dark:text-white">
            {selectedCategory ? `${selectedCategory} List` : 'All Units List'}
          </h1>
          <UnitList selectedCategory={selectedCategory} />
        </div>
      </div>
    </div>
  );
};

export default UnitsPage;
