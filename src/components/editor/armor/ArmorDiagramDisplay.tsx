/**
 * ArmorDiagramDisplay - Interactive visual armor diagram for mech units
 * 
 * Extracted from ArmorTabV2 as part of Phase 1 refactoring (Day 2)
 * Handles visual armor representation with clickable sections and auto-allocation controls
 * 
 * @see IMPLEMENTATION_REFERENCE.md for armor diagram patterns
 */

import React from 'react';

/**
 * Props for ArmorDiagramDisplay component
 */
export interface ArmorDiagramDisplayProps {
  /** Current armor allocation for all locations */
  armorAllocation: any;
  /** Selected armor section for visual highlighting */
  selectedSection: string | null;
  /** Callback when section selection changes */
  onSectionSelect: (section: string | null) => void;
  /** Callback for auto-allocation of armor points */
  onAutoAllocate: () => void;
  /** Available armor points for allocation */
  availableArmorPoints: number;
  /** Total armor points that can be allocated */
  cappedAvailablePoints: number;
  /** Unallocated armor points remaining */
  displayUnallocatedPoints: number;
  /** Whether the component is in read-only mode */
  readOnly?: boolean;
}

/**
 * ArmorDiagramDisplay Component
 * 
 * Provides interactive armor diagram with:
 * - Clickable armor sections with visual feedback
 * - Real-time armor value display
 * - Auto-allocation integration
 * - Visual selection highlighting
 * - Responsive SVG-based mech diagram
 */
export const ArmorDiagramDisplay: React.FC<ArmorDiagramDisplayProps> = ({
  armorAllocation,
  selectedSection,
  onSectionSelect,
  onAutoAllocate,
  availableArmorPoints,
  cappedAvailablePoints,
  displayUnallocatedPoints,
  readOnly = false
}) => {

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className={`font-medium mb-3 ${displayUnallocatedPoints < 0 ? 'text-orange-300' : 'text-slate-100'
        }`}>
        Armor Diagram ({displayUnallocatedPoints < 0 ? 'Over-allocated' : 'Available'}: {displayUnallocatedPoints} pts / {cappedAvailablePoints} total)
      </h3>

      {/* Auto Allocate Button - full width below title */}
      <button
        onClick={onAutoAllocate}
        disabled={readOnly}
        className={`w-full px-4 py-2 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors mb-4 flex items-center justify-center gap-2 ${displayUnallocatedPoints < 0
            ? 'bg-orange-600 hover:bg-orange-700'
            : 'bg-purple-600 hover:bg-purple-700'
          }`}
      >
        <span>⚡</span>
        <span>Auto-Allocate Armor Points</span>
        <span className={`text-xs ${displayUnallocatedPoints < 0 ? 'text-orange-200 font-medium' : 'opacity-75'
          }`}>
          {displayUnallocatedPoints < 0
            ? `(${displayUnallocatedPoints} pts over-allocated)`
            : `(${displayUnallocatedPoints} pts available)`
          }
        </span>
      </button>

      {/* Interactive Mech Diagram */}
      <div className="bg-slate-900 rounded-lg p-6">
        <svg
          width="400"
          height="500"
          viewBox="0 0 400 500"
          className="w-full h-full max-w-md mx-auto"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Head */}
          <g>
            <rect
              x={175}
              y={20}
              width={50}
              height={40}
              fill={selectedSection === 'HD' ? "#3b82f6" : "#16a34a"}
              stroke="#22c55e"
              strokeWidth="2"
              rx="4"
              className="cursor-pointer hover:fill-blue-500 transition-all"
              onClick={() => onSectionSelect('HD')}
            />
            <text x={200} y={35} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">HD</text>
            <text x={200} y={50} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
              {armorAllocation.HD?.front || 0}
            </text>
          </g>

          {/* Center Torso */}
          <g>
            <rect
              x={150}
              y={80}
              width={100}
              height={120}
              fill={selectedSection === 'CT' ? "#3b82f6" : "#d97706"}
              stroke="#f59e0b"
              strokeWidth="2"
              rx="4"
              className="cursor-pointer hover:fill-blue-600 transition-all"
              onClick={() => onSectionSelect('CT')}
            />
            <text x={200} y={125} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">CT</text>
            <text x={200} y={145} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
              {armorAllocation.CT?.front || 0}
            </text>
            <rect 
              x={150} 
              y={205} 
              width={100} 
              height={20} 
              fill="#92400e" 
              stroke="#d97706" 
              strokeWidth="1" 
              rx="2" 
              className="cursor-pointer hover:fill-blue-600 transition-all" 
              onClick={() => onSectionSelect('CT')} 
            />
            <text x={200} y={215} textAnchor="middle" fill="white" fontSize="10">
              {armorAllocation.CT?.rear || 0}
            </text>
          </g>

          {/* Left Torso */}
          <g>
            <rect
              x={60}
              y={90}
              width={80}
              height={100}
              fill={selectedSection === 'LT' ? "#3b82f6" : "#d97706"}
              stroke="#f59e0b"
              strokeWidth="2"
              rx="4"
              className="cursor-pointer hover:fill-blue-600 transition-all"
              onClick={() => onSectionSelect('LT')}
            />
            <text x={100} y={125} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">LT</text>
            <text x={100} y={145} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
              {armorAllocation.LT?.front || 0}
            </text>
            <rect 
              x={60} 
              y={195} 
              width={80} 
              height={20} 
              fill="#92400e" 
              stroke="#d97706" 
              strokeWidth="1" 
              rx="2" 
              className="cursor-pointer hover:fill-blue-600 transition-all" 
              onClick={() => onSectionSelect('LT')} 
            />
            <text x={100} y={208} textAnchor="middle" fill="white" fontSize="10">
              {armorAllocation.LT?.rear || 0}
            </text>
          </g>

          {/* Right Torso */}
          <g>
            <rect
              x={260}
              y={90}
              width={80}
              height={100}
              fill={selectedSection === 'RT' ? "#3b82f6" : "#d97706"}
              stroke="#f59e0b"
              strokeWidth="2"
              rx="4"
              className="cursor-pointer hover:fill-blue-600 transition-all"
              onClick={() => onSectionSelect('RT')}
            />
            <text x={300} y={125} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">RT</text>
            <text x={300} y={145} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
              {armorAllocation.RT?.front || 0}
            </text>
            <rect 
              x={260} 
              y={195} 
              width={80} 
              height={20} 
              fill="#92400e" 
              stroke="#d97706" 
              strokeWidth="1" 
              rx="2" 
              className="cursor-pointer hover:fill-blue-600 transition-all" 
              onClick={() => onSectionSelect('RT')} 
            />
            <text x={300} y={208} textAnchor="middle" fill="white" fontSize="10">
              {armorAllocation.RT?.rear || 0}
            </text>
          </g>

          {/* Left Arm */}
          <g>
            <rect
              x={10}
              y={100}
              width={40}
              height={140}
              fill={selectedSection === 'LA' ? "#3b82f6" : "#d97706"}
              stroke="#f59e0b"
              strokeWidth="2"
              rx="4"
              className="cursor-pointer hover:fill-blue-600 transition-all"
              onClick={() => onSectionSelect('LA')}
            />
            <text x={30} y={160} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">LA</text>
            <text x={30} y={180} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
              {armorAllocation.LA?.front || 0}
            </text>
          </g>

          {/* Right Arm */}
          <g>
            <rect
              x={350}
              y={100}
              width={40}
              height={140}
              fill={selectedSection === 'RA' ? "#3b82f6" : "#d97706"}
              stroke="#f59e0b"
              strokeWidth="2"
              rx="4"
              className="cursor-pointer hover:fill-blue-600 transition-all"
              onClick={() => onSectionSelect('RA')}
            />
            <text x={370} y={160} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">RA</text>
            <text x={370} y={180} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
              {armorAllocation.RA?.front || 0}
            </text>
          </g>

          {/* Left Leg */}
          <g>
            <rect
              x={110}
              y={230}
              width={60}
              height={180}
              fill={selectedSection === 'LL' ? "#3b82f6" : "#d97706"}
              stroke="#f59e0b"
              strokeWidth="2"
              rx="4"
              className="cursor-pointer hover:fill-blue-600 transition-all"
              onClick={() => onSectionSelect('LL')}
            />
            <text x={140} y={310} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">LL</text>
            <text x={140} y={330} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
              {armorAllocation.LL?.front || 0}
            </text>
          </g>

          {/* Right Leg */}
          <g>
            <rect
              x={230}
              y={230}
              width={60}
              height={180}
              fill={selectedSection === 'RL' ? "#3b82f6" : "#d97706"}
              stroke="#f59e0b"
              strokeWidth="2"
              rx="4"
              className="cursor-pointer hover:fill-blue-600 transition-all"
              onClick={() => onSectionSelect('RL')}
            />
            <text x={260} y={310} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">RL</text>
            <text x={260} y={330} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
              {armorAllocation.RL?.front || 0}
            </text>
          </g>
        </svg>

        {/* Diagram Legend */}
        <div className="mt-4 text-center">
          <div className="text-xs text-slate-400 mb-2">Click any section to edit armor values</div>
          <div className="flex justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-600 rounded"></div>
              <span className="text-slate-400">Head</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-600 rounded"></div>
              <span className="text-slate-400">Torso/Limbs</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-800 rounded"></div>
              <span className="text-slate-400">Rear Armor</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-600 rounded"></div>
              <span className="text-slate-400">Selected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
