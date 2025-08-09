// battletech-editor-app/pages/compendium/index.tsx
import React, { useState } from 'react';
import Head from 'next/head';
import UnitCategoryNav from '../../components/compendium/UnitCategoryNav';
import UnitFilters, { UnitFilterState } from '../../components/compendium/UnitFilters';
import UnitCompendiumList from '../../components/compendium/UnitCompendiumList';
import EquipmentCategoryNav from '../../components/compendium/EquipmentCategoryNav';
import EquipmentFilters, { EquipmentFilterState } from '../../components/compendium/EquipmentFilters';
import EquipmentCompendiumList from '../../components/compendium/EquipmentCompendiumList';
import { useEffect } from 'react'
import { useCatalogBrowser } from '../../hooks/catalog/useCatalogBrowser'

const initialUnitFilters: UnitFilterState = { searchTerm: '', weightClass: '', techBase: '', hasQuirk: '', startYear: '', endYear: '' };
const initialEquipmentFilters: EquipmentFilterState = { searchTerm: '', techBase: '', era: '' };

const CompendiumPage: React.FC = () => {
  const [activeView, setActiveView] = useState<'units' | 'equipment'>('units');

  const [selectedUnitCategory, setSelectedUnitCategory] = useState<string | null>(null);
  const [currentUnitFilters, setCurrentUnitFilters] = useState<UnitFilterState>(initialUnitFilters);

  const [selectedEquipmentCategory, setSelectedEquipmentCategory] = useState<string | null>(null);
  const [currentEquipmentFilters, setCurrentEquipmentFilters] = useState<EquipmentFilterState>(initialEquipmentFilters);

  const handleUnitFiltersApply = (filters: UnitFilterState) => setCurrentUnitFilters(filters);
  const handleEquipmentFiltersApply = (filters: EquipmentFilterState) => setCurrentEquipmentFilters(filters);

  const {
    items,
    totalCount,
    filters,
    setFilters,
    isLoading,
    error,
    setContext
  } = useCatalogBrowser({ initialPageSize: 20, initialContext: { techBase: 'Inner Sphere', unitType: 'BattleMech' } })

  useEffect(() => {
    // Example: ensure context on mount
    void setContext({ techBase: 'Inner Sphere', unitType: 'BattleMech' })
  }, [])

  return (
    <>
      <Head>
        <title>Compendium | BattleTech Editor</title>
      </Head>
      <div className="container mx-auto p-4">
        <div className="flex border-b mb-4">
          <button className={`py-2 px-4 ${activeView === 'units' ? 'border-b-2 border-blue-500' : ''}`} onClick={() => setActiveView('units')}>Units</button>
          <button className={`py-2 px-4 ${activeView === 'equipment' ? 'border-b-2 border-blue-500' : ''}`} onClick={() => setActiveView('equipment')}>Equipment</button>
        </div>
        {activeView === 'units' && (
          <section id="units-compendium">
            <h2 className="text-2xl font-bold mb-4">Units Compendium</h2>
            <div className="md:flex md:space-x-4">
              <div className="md:w-1/4">
                <UnitCategoryNav
                  onSelectCategory={setSelectedUnitCategory}
                  selectedCategory={selectedUnitCategory}
                />
              </div>
              <div className="md:w-3/4">
                <UnitFilters onFiltersApply={handleUnitFiltersApply} />
            <UnitCompendiumList 
              filters={currentUnitFilters}
              selectedCategory={selectedUnitCategory}
            />
              </div>
            </div>
          </section>
        )}

        {activeView === 'equipment' && (
          <section id="equipment-compendium">
            <h2 className="text-2xl font-bold mb-4">Equipment Compendium</h2>
            <div className="md:flex md:space-x-4">
              <div className="md:w-1/4">
                <EquipmentCategoryNav
                  onSelectCategory={setSelectedEquipmentCategory}
                  selectedCategory={selectedEquipmentCategory}
                />
              </div>
              <div className="md:w-3/4">
                <EquipmentFilters onFiltersApply={handleEquipmentFiltersApply} />
                <EquipmentCompendiumList
                  filters={currentEquipmentFilters}
                  selectedEquipmentCategory={selectedEquipmentCategory}
                />
              </div>
            </div>
          </section>
        )}
        <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Compendium</h1>
      <div className="mb-2">
        <input
          className="border px-2 py-1"
          placeholder="Search catalog..."
          value={filters.text}
          onChange={e => setFilters({ text: e.target.value })}
        />
      </div>
      {isLoading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="text-sm text-slate-400 mb-2">Total: {totalCount}</div>
      <ul className="space-y-1">
        {items.slice(0, 20).map(it => (
          <li key={it.id} className="border border-slate-700 rounded p-2">
            <div className="font-medium">{it.name}</div>
            <div className="text-xs text-slate-400">{it.kind} • {it.techBase} • {it.introductionYear}</div>
          </li>
        ))}
      </ul>
    </div>
      </div>
    </>
  );
};

export default CompendiumPage;
