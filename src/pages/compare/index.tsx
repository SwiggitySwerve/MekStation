import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import {
    CustomVariantDetail,
    UnitEquipmentItem,
    CriticalLocation,
    ComparisonResult,
    EquipmentItem, // Added for availableEquipment state
    // Assuming CustomVariantListItem and ApiListResponse are also in customizer.ts or a shared types file
    // If not, they might need to be imported or defined if used directly by API calls here
} from '../../types/customizer';
import VariantComparisonDisplay from '../../components/comparison/VariantComparisonDisplay'; // Import the new component

// Local or imported CustomVariantListItem - make sure it's defined
interface CustomVariantListItem { // This might come from types/customizer.ts if exported
    id: number;
    base_unit_id: number;
    variant_name: string;
    notes?: string | null;
    created_at: string;
    updated_at: string;
}
// Local or imported ApiListResponse for the subversion list
interface SubversionListApiResponse { // Specific name to avoid conflict if ApiListResponse is generic elsewhere
    items: CustomVariantListItem[];
}

// Add missing type definition
interface CriticalsComparisonDifference {
    location: string;
    slotsA: string[];
    slotsB: string[];
}


const CompareVariantsPage: React.FC = () => {
  const [baseUnitIdInput, setBaseUnitIdInput] = useState<string>("");
  const [variantNameInput, setVariantNameInput] = useState<string>("");

  const [subversions, setSubversions] = useState<CustomVariantListItem[]>([]);
  const [isLoadingSubversions, setIsLoadingSubversions] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null); // For fetching subversions list

  const [selectedVariantAId, setSelectedVariantAId] = useState<number | null>(null);
  const [selectedVariantBId, setSelectedVariantBId] = useState<number | null>(null);

  const [variantADetails, setVariantADetails] = useState<CustomVariantDetail | null>(null);
  const [variantBDetails, setVariantBDetails] = useState<CustomVariantDetail | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState<boolean>(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null); // For fetching/processing comparison details
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentItem[]>([]); // For tonnage calculation


  const handleFetchSubversions = async () => {
    if (!baseUnitIdInput.trim() || !variantNameInput.trim()) {
      setError("Please enter both Base Unit ID and Variant Name.");
      setSubversions([]);
      return;
    }
    setIsLoadingSubversions(true);
    setError(null);
    setSelectedVariantAId(null); // Reset selections
    setSelectedVariantBId(null);
    try {
      // Corrected API endpoint as per previous subtask: /api/custom-variants (without /list)
      const response = await fetch(`/api/custom-variants?baseUnitId=${baseUnitIdInput.trim()}&variantName=${variantNameInput.trim()}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || `Failed to fetch subversions: ${response.status}`);
      }
      const data: SubversionListApiResponse = await response.json(); // Use specific response type
      setSubversions(data.items || []);
      if ((data.items || []).length === 0) {
        setError("No subversions found for this Base Unit ID and Variant Name combination.");
        setComparisonResult(null); // Clear previous results if any
        setVariantADetails(null);
        setVariantBDetails(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubversions([]);
    } finally {
      setIsLoadingSubversions(false);
    }
  };

  const handleSelectVariant = (variantId: number, selectionType: 'A' | 'B') => {
    if (selectionType === 'A') {
      if (variantId === selectedVariantBId) { // Cannot select same variant for both A and B
        setError("Cannot select the same variant for both comparison slots.");
        return;
      }
      setSelectedVariantAId(variantId);
    } else { // selectionType === 'B'
      if (variantId === selectedVariantAId) {
        setError("Cannot select the same variant for both comparison slots.");
        return;
      }
      setSelectedVariantBId(variantId);
    }
    if (error === "Cannot select the same variant for both comparison slots.") setError(null); // Clear specific error
  };

  const canCompare = selectedVariantAId !== null && selectedVariantBId !== null;

  const performComparison = (variantA: CustomVariantDetail, variantB: CustomVariantDetail, allEquipment: EquipmentItem[]) => {
    if (!variantA.custom_data || !variantB.custom_data) {
      setComparisonError("Custom data missing for one or both variants.");
      setComparisonResult(null);
      return;
    }

    const loadoutA = variantA.custom_data.loadout || [];
    const loadoutB = variantB.custom_data.loadout || [];
    const criticalsA = variantA.custom_data.criticals || [];
    const criticalsB = variantB.custom_data.criticals || [];

    // Loadout Comparison
    const onlyInA_calc: UnitEquipmentItem[] = [];
    const onlyInB_calc: UnitEquipmentItem[] = [...loadoutB];
    loadoutA.forEach((itemA: UnitEquipmentItem) => {
      const itemBIndex = onlyInB_calc.findIndex(
        (itemB: UnitEquipmentItem) => itemB.item_name === itemA.item_name && itemB.location === itemA.location
      );
      if (itemBIndex !== -1) {
        onlyInB_calc.splice(itemBIndex, 1);
      } else {
        onlyInA_calc.push(itemA);
      }
    });

    // Criticals Comparison
    const criticalsDifferences_calc: CriticalsComparisonDifference[] = [];
    const allLocations = new Set([...criticalsA.map((c: CriticalLocation) => c.location), ...criticalsB.map((c: CriticalLocation) => c.location)]);
    allLocations.forEach(locName => {
      const critLocA = criticalsA.find((c: CriticalLocation) => c.location === locName);
      const critLocB = criticalsB.find((c: CriticalLocation) => c.location === locName);
      const slotsA_data = critLocA?.slots || [];
      const slotsB_data = critLocB?.slots || [];
      if (JSON.stringify(slotsA_data) !== JSON.stringify(slotsB_data)) {
        criticalsDifferences_calc.push({ location: locName, slotsA: slotsA_data, slotsB: slotsB_data });
      }
    });

    // Calculate Tonnages
    const calculateTotalEquipmentTonnage = (loadout: UnitEquipmentItem[]): number => {
      return loadout.reduce((sum, loadoutItem) => {
        const equipmentDetails = allEquipment.find(
          eq => eq.internal_id === loadoutItem.item_name || eq.name === loadoutItem.item_name
        );
        return sum + (equipmentDetails?.tonnage || 0);
      }, 0);
    };
    const tonnageA = calculateTotalEquipmentTonnage(loadoutA);
    const tonnageB = calculateTotalEquipmentTonnage(loadoutB);

    setComparisonResult({
      loadoutChanges: { onlyInA: onlyInA_calc, onlyInB: onlyInB_calc },
      criticalsDifferences: criticalsDifferences_calc,
      variantADetails: variantA,
      variantBDetails: variantB,
      totalEquipmentTonnageA: tonnageA,
      totalEquipmentTonnageB: tonnageB,
    });
  };

  // Effect to fetch all equipment items once for tonnage calculations
  useEffect(() => {
    const fetchAllEquipment = async () => {
        try {
            // Assuming an API endpoint that can return all (or a large number of) equipment items
            // Adjust limit as necessary or implement pagination if the list is extremely large
            const response = await fetch(`/api/equipment?limit=2000`);
            if (!response.ok) {
                throw new Error('Failed to fetch all equipment data for tonnage calculation.');
            }
            const data = await response.json(); // Assuming this API returns ApiListResponse<EquipmentItem>
            setAvailableEquipment(data.items || []);
        } catch (err) {
            console.error("Error fetching all equipment:", err);
            // Handle error - perhaps set a page-level error state or a specific one for this
            setComparisonError(`Failed to load master equipment list: ${err instanceof Error ? err.message : String(err)} This may affect tonnage calculations.`);
        }
    };
    fetchAllEquipment();
  }, []);


  const handleStartComparison = async () => {
    if (!selectedVariantAId || !selectedVariantBId) {
      setComparisonError("Two variants must be selected for comparison.");
      return;
    }
    if (selectedVariantAId === selectedVariantBId) {
      setComparisonError("Cannot compare a variant with itself. Please select two different variants.");
      return;
    }

    setIsLoadingComparison(true);
    setComparisonError(null);
    setVariantADetails(null);
    setVariantBDetails(null);
    setComparisonResult(null);

    try {
      // Fetch Variant A details
      const responseA = await fetch(`/api/custom-variants/${selectedVariantAId}`);
      if (!responseA.ok) {
        const errA = await responseA.json();
        throw new Error(`Failed to fetch Variant A (${selectedVariantAId}): ${errA.message || responseA.statusText}`);
      }
      const dataA = await responseA.json();
      setVariantADetails(dataA.variant);

      // Fetch Variant B details
      const responseB = await fetch(`/api/custom-variants/${selectedVariantBId}`);
      if (!responseB.ok) {
        const errB = await responseB.json();
        throw new Error(`Failed to fetch Variant B (${selectedVariantBId}): ${errB.message || responseB.statusText}`);
      }
      const dataB = await responseB.json();
      setVariantBDetails(dataB.variant);

      // Perform comparison once both are fetched
      if (dataA.variant && dataB.variant) {
        performComparison(dataA.variant, dataB.variant, availableEquipment); // Pass availableEquipment
      }

    } catch (err) {
      setComparisonError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingComparison(false);
    }
  };

  return (
    <>
      <Head>
        <title>Compare Variants | BattleTech Editor</title>
      </Head>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Compare Custom Unit Subversions</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded shadow">
          <div>
            <label htmlFor="baseUnitIdInput" className="block text-sm font-medium text-gray-700">Base Unit ID</label>
            <input
              type="text"
              id="baseUnitIdInput"
              value={baseUnitIdInput}
              onChange={(e) => setBaseUnitIdInput(e.target.value)}
              placeholder="e.g., 1 or base unit's text ID"
              className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="variantNameInput" className="block text-sm font-medium text-gray-700">Custom Variant Name</label>
            <input
              type="text"
              id="variantNameInput"
              value={variantNameInput}
              onChange={(e) => setVariantNameInput(e.target.value)}
              placeholder="e.g., My Custom Atlas"
              className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFetchSubversions}
              disabled={isLoadingSubversions || !baseUnitIdInput.trim() || !variantNameInput.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoadingSubversions ? 'Fetching...' : 'Fetch Subversions'}
            </button>
          </div>
        </div>

        {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

        {subversions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Select Two Subversions to Compare:</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Variant A Selection */}
              <div>
                <h3 className="text-lg font-medium mb-1">Select Variant A:</h3>
                <ul className="space-y-1 max-h-60 overflow-y-auto border p-2 rounded">
                  {subversions.map(variant => (
                      <li key={variant.id}
                        className={`p-2 border rounded cursor-pointer ${selectedVariantAId === variant.id ? 'bg-blue-200 ring-2 ring-blue-500' : 'hover:bg-gray-100'}`}
                        onClick={() => handleSelectVariant(variant.id, 'A')}>
                        ID: {variant.id} - Notes: {variant.notes || "N/A"} (Saved: {new Date(variant.created_at).toLocaleString()})
                    </li>
                  ))}
                </ul>
              </div>
              {/* Variant B Selection */}
              <div>
                <h3 className="text-lg font-medium mb-1">Select Variant B:</h3>
                 <ul className="space-y-1 max-h-60 overflow-y-auto border p-2 rounded">
                  {subversions.map(variant => (
                      <li key={variant.id}
                        className={`p-2 border rounded cursor-pointer ${selectedVariantBId === variant.id ? 'bg-green-200 ring-2 ring-green-500' : 'hover:bg-gray-100'}`}
                        onClick={() => handleSelectVariant(variant.id, 'B')}>
                        ID: {variant.id} - Notes: {variant.notes || "N/A"} (Saved: {new Date(variant.created_at).toLocaleString()})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
             <div className="mt-4 text-center">
                <button
                    onClick={handleStartComparison}
                    disabled={!canCompare || isLoadingComparison}
                    className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                    {isLoadingComparison ? 'Comparing...' : 'Compare Selected Variants (A vs B)'}
                </button>
            </div>
          </div>
        )}

        {isLoadingComparison && <div className="mt-4 p-2 text-center">Loading comparison data...</div>}
        {comparisonError && <div className="mt-4 p-2 bg-red-100 text-red-700 rounded">{comparisonError}</div>}

        {comparisonResult ? (
          <VariantComparisonDisplay comparisonResult={comparisonResult} />
        ) : (
          !isLoadingComparison && selectedVariantAId && selectedVariantBId &&
          <div className="mt-4 p-2 text-center text-gray-500">Click "Compare" to see the results.</div>
        )}
      </div>
    </>
  );
};

export default CompareVariantsPage;
