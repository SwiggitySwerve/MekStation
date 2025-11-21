// battletech-editor-app/components/compendium/UnitCategoryNav.tsx
import React, { useState, useEffect } from 'react';
import { getMetadata } from '../../services/mockApiService';

interface UnitCategoryNavProps {
  onSelectCategory: (category: string | null) => void;
  selectedCategory: string | null;
}

const UnitCategoryNav: React.FC<UnitCategoryNavProps> = ({ onSelectCategory, selectedCategory }) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to convert unit type abbreviations to proper names
  const getCategoryDisplayName = (category: string): string => {
    const categoryMap: { [key: string]: string } = {
      'meks': 'BattleMechs',
      'vehicles': 'Vehicles',
      'infantry': 'Infantry',
      'battlearmor': 'Battle Armor',
      'ge': 'Gun Emplacements',
      'fighters': 'Aerospace Fighters',
      'dropships': 'DropShips',
      'warship': 'WarShips',
      'protomeks': 'ProtoMechs',
      'convfighter': 'Conventional Fighters',
      'smallcraft': 'Small Craft',
      'spacestation': 'Space Stations',
      'jumpships': 'JumpShips',
      'handheld': 'Handheld Weapons'
    };
    return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const data = await getMetadata('/mockdata/mockUnitCategories.json');
        setCategories(data);
        setError(null); // Clear any previous error
      } catch (e) {
        if (e instanceof Error) {
          setError(e.message);
        } else {
          setError('An unknown error occurred');
        }
        console.error("Failed to fetch unit categories:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) return <p>Loading unit categories...</p>;
  if (error) return <p className="text-red-500">Error loading unit categories: {error}</p>;
  if (!categories.length) return <p>No unit categories found.</p>;

  return (
    <nav className="navy-section">
      <h3 className="text-lg font-semibold mb-3">Unit Categories</h3>
      
      {/* Desktop/Tablet vertical layout */}
      <div className="hidden sm:block">
        <ul className="space-y-1">
          {categories.map((category) => (
            <li key={category}>
              <button
                onClick={() => onSelectCategory(category)}
                className={`hover:underline w-full text-left px-2 py-1 rounded transition-colors text-sm ${
                  selectedCategory === category 
                    ? 'font-bold bg-blue-100 text-blue-800' 
                    : 'hover:bg-gray-100'
                }`}
              >
                {getCategoryDisplayName(category)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Mobile horizontal scrollable layout */}
      <div className="block sm:hidden">
        <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {getCategoryDisplayName(category)}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default UnitCategoryNav;
