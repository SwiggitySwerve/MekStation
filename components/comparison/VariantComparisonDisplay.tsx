import React from 'react';
// Assuming types are in types/customizer.ts or a shared file
import { ComparisonResult, UnitEquipmentItem, CriticalsComparisonDifference } from '../../types/customizer';

interface VariantComparisonDisplayProps {
  comparisonResult: ComparisonResult | null;
}

const renderLoadoutList = (title: string, items: UnitEquipmentItem[], baseClass: string) => (
  <div className={baseClass}>
    <h4 className="font-semibold text-md mb-1">{title} ({items.length})</h4>
    {items.length === 0 ? <p className="text-xs text-gray-500">None</p> : (
      <ul className="list-disc pl-4 text-xs space-y-0.5">
        {items.map((item, index) => <li key={index} title={`${item.item_type} in ${item.location}`}>{item.item_name} <span className="text-gray-600">({item.location})</span></li>)}
      </ul>
    )}
  </div>
);

const renderCriticalsDiff = (diff: CriticalsComparisonDifference, variantLetter: 'A' | 'B') => {
    const slots = variantLetter === 'A' ? diff.slotsA : diff.slotsB;
    return (
        <div className={variantLetter === 'A' ? 'pr-1' : 'pl-1'}>
            <h5 className="font-medium text-xs">{variantLetter === 'A' ? "Variant A Slots" : "Variant B Slots"}:</h5>
            {slots.length === 0 ? <p className="text-xs text-gray-400 italic">No slots defined/empty.</p> : (
                <ul className="text-xs space-y-px">
                    {slots.map((slot, idx) => (
                        <li key={idx} className="bg-gray-200 p-0.5 rounded truncate" title={slot}>{idx + 1}: {slot || "-Empty-"}</li>
                    ))}
                </ul>
            )}
        </div>
    );
};


const VariantComparisonDisplay: React.FC<VariantComparisonDisplayProps> = ({ comparisonResult }) => {
  if (!comparisonResult) {
    return <div className="mt-4 p-2 text-center">Select two variants and click "Compare" to see details.</div>;
  }

  const { variantADetails, variantBDetails, loadoutChanges, criticalsDifferences, totalEquipmentTonnageA, totalEquipmentTonnageB } = comparisonResult;

  // Derive common loadout items (items in both A and B, potentially in same/diff locations)
  const commonLoadoutItems: Array<{itemA: UnitEquipmentItem, itemB: UnitEquipmentItem | undefined}> = [];
  const tempLoadoutB = [...(variantBDetails.custom_data.loadout || [])];
  (variantADetails.custom_data.loadout || []).forEach(itemA => {
      const itemBIndex = tempLoadoutB.findIndex(itemB => itemB.item_name === itemA.item_name && itemB.location === itemA.location);
      if (itemBIndex !== -1) {
          commonLoadoutItems.push({ itemA, itemB: tempLoadoutB.splice(itemBIndex, 1)[0] });
      }
  });


  return (
    <div className="content-card mt-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Comparison: '{variantADetails.variant_name}' Subversions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

        {/* Column for Variant A */}
        <div className="border p-3 rounded bg-gray-50">
          <h3 className="text-lg font-bold text-blue-700 mb-2">Variant A: {variantADetails.variant_name}</h3>
          <p className="text-xs text-gray-600 mb-1">Saved: {new Date(variantADetails.created_at).toLocaleString()}</p>
          {variantADetails.notes && <p className="text-xs italic text-gray-700 mb-2">Notes: {variantADetails.notes}</p>}
          <p className="text-sm font-semibold">Equipment Tonnage: {totalEquipmentTonnageA.toFixed(2)} tons</p>
          {renderLoadoutList("Equipment Only in Variant A:", loadoutChanges.onlyInA, "mt-3 p-2 bg-red-50 rounded border border-red-200")}
        </div>

        {/* Column for Variant B */}
        <div className="border p-3 rounded bg-gray-50">
          <h3 className="text-lg font-bold text-green-700 mb-2">Variant B: {variantBDetails.variant_name}</h3>
          <p className="text-xs text-gray-600 mb-1">Saved: {new Date(variantBDetails.created_at).toLocaleString()}</p>
          {variantBDetails.notes && <p className="text-xs italic text-gray-700 mb-2">Notes: {variantBDetails.notes}</p>}
          <p className="text-sm font-semibold">Equipment Tonnage: {totalEquipmentTonnageB.toFixed(2)} tons</p>
          {renderLoadoutList("Equipment Only in Variant B:", loadoutChanges.onlyInB, "mt-3 p-2 bg-green-50 rounded border border-green-200")}
        </div>

        {/* Common Equipment Section - Spans full width below A & B summaries */}
        <div className="md:col-span-2 mt-3 border p-3 rounded bg-gray-50">
             <h3 className="text-lg font-semibold mb-2 text-center">Common Equipment (Same Name & Location)</h3>
            {commonLoadoutItems.length === 0 ? <p className="text-sm text-gray-500 text-center">No equipment items are identical in name and location.</p> : (
                <ul className="list-none pl-0 text-sm space-y-1 columns-1 md:columns-2 lg:columns-3">
                    {commonLoadoutItems.map(({itemA}, index) => (
                         <li key={index} className="p-1 bg-gray-100 rounded border" title={`${itemA.item_type} in ${itemA.location}`}>
                            {itemA.item_name} <span className="text-gray-600 text-xs">({itemA.location})</span>
                         </li>
                    ))}
                </ul>
            )}
        </div>

        {/* Criticals Differences Section - Spans full width */}
        {criticalsDifferences.length > 0 && (
          <div className="md:col-span-2 mt-4 border p-3 rounded">
            <h3 className="text-lg font-semibold mb-3 text-center">Critical Slot Differences</h3>
            <div className="space-y-3">
              {criticalsDifferences.map((diff, index) => (
                <div key={index} className="p-2 border rounded shadow-sm bg-yellow-50">
                  <h4 className="font-semibold text-md text-yellow-800 mb-2 text-center">Location: {diff.location}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {renderCriticalsDiff(diff, 'A')}
                    {renderCriticalsDiff(diff, 'B')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
         {criticalsDifferences.length === 0 && (
             <div className="md:col-span-2 mt-4 text-center text-sm text-gray-600">No differences in critical slot assignments found.</div>
         )}

      </div>
    </div>
  );
};

export default VariantComparisonDisplay;
