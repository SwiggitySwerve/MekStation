// battletech-editor-app/components/compendium/EquipmentFilters.tsx
import React, { useState, useEffect } from 'react';
import { getMetadata } from '../../services/mockApiService';

export interface EquipmentFilterState {
  searchTerm: string;
  techBase: string;
  era: string;
  // Note: 'type' (primary category) will be handled by EquipmentCategoryNav selection
}

interface EquipmentFiltersProps {
  onFiltersApply: (filters: EquipmentFilterState) => void;
}

const EquipmentFilters: React.FC<EquipmentFiltersProps> = ({ onFiltersApply }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [techBase, setTechBase] = useState('');
  const [era, setEra] = useState('');

  const [techBases, setTechBases] = useState<string[]>([]);
  const [eras, setEras] = useState<string[]>([]); // Eras for equipment are years/strings

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tbData, eraData] = await Promise.all([
          getMetadata('/mockdata/mockEquipmentTechBases.json'),
          getMetadata('/mockdata/mockEquipmentEras.json'),
        ]);

        setTechBases(tbData);
        setEras(eraData);
        setError(null);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred';
        setError(errorMsg);
        console.error("Failed to fetch equipment filter data:", errorMsg);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleApply = () => {
    onFiltersApply({ searchTerm, techBase, era });
    console.log('Applying Equipment Filters:', { searchTerm, techBase, era });
  };

  const handleClear = () => {
    setSearchTerm('');
    setTechBase('');
    setEra('');
    onFiltersApply({ searchTerm: '', techBase: '', era: '' });
    console.log('Cleared Equipment Filters');
  };

  if (loading) return <p>Loading filters...</p>;
  if (error) return <p className="text-red-500">Error loading filters: {error}</p>;

  return (
    <div className="navy-section mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="eqSearchTerm">Search Name</label>
          <input
            type="text"
            id="eqSearchTerm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full bg-white border border-gray-300 text-gray-900 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="eqTechBase">Tech Base</label>
          <select
            id="eqTechBase"
            value={techBase}
            onChange={(e) => setTechBase(e.target.value)}
            className="block w-full bg-white border border-gray-300 text-gray-900 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Select Tech Base</option>
            {techBases.map(tb => <option key={tb} value={tb}>{tb}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="eqEra">Era/Year</label>
          <select
            id="eqEra"
            value={era}
            onChange={(e) => setEra(e.target.value)}
            className="block w-full bg-white border border-gray-300 text-gray-900 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All</option>
            {eras.map(er => <option key={er} value={er}>{er}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4 flex space-x-2">
        <button
          onClick={handleApply}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Apply Filters
        </button>
        <button
          onClick={handleClear}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
};
export default EquipmentFilters;
