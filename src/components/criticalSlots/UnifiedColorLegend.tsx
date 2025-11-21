/**
 * Unified Color Legend - Comprehensive color reference for the Critical Slots V2 system
 * Shows all colors used across critical slots, equipment types, and status indicators
 */

import React, { useState } from 'react'

export function UnifiedColorLegend() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-white text-lg font-bold">Unified Color Legend</h2>
        <span className="text-gray-400 text-xl">
          {isExpanded ? '−' : '+'}
        </span>
      </div>
      
      {isExpanded && (
        <div className="mt-4">
          {/* Critical Slot Colors */}
          <div className="mb-6">
            <h3 className="text-gray-300 text-sm font-medium mb-3">Critical Slot Colors:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-600 rounded border border-gray-500"></div>
                <span className="text-gray-300">Empty Slot</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-600 rounded border border-gray-500"></div>
                <span className="text-gray-300">Engine</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-600 rounded border border-gray-500"></div>
                <span className="text-gray-300">Gyro</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-600 rounded border border-gray-500"></div>
                <span className="text-gray-300">Actuators</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-600 rounded border border-gray-500"></div>
                <span className="text-gray-300">Life Support/Sensors/Cockpit</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-600 rounded border border-gray-500"></div>
                <span className="text-gray-300">Allocated Equipment</span>
              </div>
            </div>
          </div>

          {/* Equipment Type Colors */}
          <div className="mb-6">
            <h3 className="text-gray-300 text-sm font-medium mb-3">Equipment Type Colors:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-700 rounded border border-gray-500"></div>
                <span className="text-gray-300">Weapons</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-700 rounded border border-gray-500"></div>
                <span className="text-gray-300">Ammunition</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-700 rounded border border-gray-500"></div>
                <span className="text-gray-300">Equipment</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-cyan-700 rounded border border-gray-500"></div>
                <span className="text-gray-300">Heat Sinks</span>
              </div>
            </div>
          </div>

          {/* Status Colors */}
          <div className="mb-6">
            <h3 className="text-gray-300 text-sm font-medium mb-3">Equipment Status Colors:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <div className="bg-green-900 text-green-200 border border-green-600 px-2 py-1 rounded text-xs">Allocated</div>
                <span className="text-gray-300">Equipment in critical slots</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="bg-red-900 text-red-200 border border-red-600 px-2 py-1 rounded text-xs">Unallocated</div>
                <span className="text-gray-300">Equipment awaiting assignment</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="bg-green-700 border border-green-500 text-white px-2 py-1 rounded text-xs ring-1 ring-green-400">Assignable</div>
                <span className="text-gray-300">Slot can accept selected equipment</span>
              </div>
            </div>
          </div>

          {/* Tech Base Colors */}
          <div className="mb-6">
            <h3 className="text-gray-300 text-sm font-medium mb-3">Tech Base Colors:</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-blue-400 font-medium">Inner Sphere</span>
                <span className="text-gray-300">Standard BattleTech technology</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-400 font-medium">Clan</span>
                <span className="text-gray-300">Advanced Clan technology</span>
              </div>
            </div>
          </div>

          {/* Interactive State Colors */}
          <div className="mb-6">
            <h3 className="text-gray-300 text-sm font-medium mb-3">Interactive State Colors:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-300 rounded border border-gray-500"></div>
                <span className="text-gray-300">★ Selected Equipment (for assignment)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-400 rounded border border-gray-500"></div>
                <span className="text-gray-300">Selection Ring (selected items)</span>
              </div>
            </div>
          </div>

          {/* Usage Instructions */}
          <div className="pt-4 border-t border-gray-600">
            <h3 className="text-gray-300 text-sm font-medium mb-3">Color Usage Guide:</h3>
            <div className="text-gray-400 text-xs space-y-1">
              <p>• <strong className="text-white">Critical Slots:</strong> Colors indicate slot type and contents</p>
              <p>• <strong className="text-white">Equipment Tables:</strong> Colored dots show equipment types, status badges show allocation state</p>
              <p>• <strong className="text-white">Equipment Browser:</strong> Tech base colors help distinguish Inner Sphere vs Clan equipment</p>
              <p>• <strong className="text-white">Interactive Elements:</strong> Yellow stars and blue rings indicate selected items</p>
              <p>• <strong className="text-white">Assignable Slots:</strong> Green highlighting shows where selected equipment can be placed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
