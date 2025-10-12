/**
 * Tab Manager - Handles tab bar UI and tab operations
 */

import React, { useState } from 'react'
import { useMultiUnit } from './MultiUnitProvider'
import { NewTabModal } from './NewTabModal'
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes'

interface TabManagerProps {
  children: React.ReactNode
}

export function TabManager({ children }: TabManagerProps) {
  const { 
    tabs, 
    activeTabId, 
    setActiveTab, 
    closeTab, 
    renameTab, 
    duplicateTab,
    createTab 
  } = useMultiUnit()
  
  const [showNewTabModal, setShowNewTabModal] = useState(false)
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  
  // Handle new tab creation
  const handleCreateTab = (name?: string, config?: UnitConfiguration) => {
    createTab(name, config)
    setShowNewTabModal(false)
  }
  
  // Handle tab rename
  const handleStartEdit = (tabId: string, currentName: string) => {
    setEditingTabId(tabId)
    setEditingName(currentName)
  }
  
  const handleFinishEdit = () => {
    if (editingTabId && editingName.trim()) {
      renameTab(editingTabId, editingName.trim())
    }
    setEditingTabId(null)
    setEditingName('')
  }
  
  const handleCancelEdit = () => {
    setEditingTabId(null)
    setEditingName('')
  }
  
  // Handle keyboard events for editing
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }
  
  // Handle tab close with confirmation for modified tabs
  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    const tab = tabs.find(t => t.id === tabId)
    if (tab?.isModified) {
      const confirmed = window.confirm(`Close "${tab.name}"? Unsaved changes will be lost.`)
      if (!confirmed) return
    }
    
    closeTab(tabId)
  }
  
  // Handle right-click context menu
  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return
    
    // Simple context menu using window.confirm for now
    const action = window.prompt(
      `Actions for "${tab.name}":\n\n` +
      `1. Rename\n` +
      `2. Duplicate\n` +
      `3. Close\n\n` +
      `Enter action number (1-3):`,
      '1'
    )
    
    switch (action) {
      case '1':
        handleStartEdit(tabId, tab.name)
        break
      case '2':
        duplicateTab(tabId)
        break
      case '3':
        handleCloseTab(tabId, e as any)
        break
    }
  }
  
  // Empty state when no tabs
  if (tabs.length === 0) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-xl font-bold text-slate-200 mb-2">No Units Created</h2>
          <p className="text-slate-400 mb-6">Create a new unit to get started with the BattleTech editor</p>
          <button
            onClick={() => setShowNewTabModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Create New Unit
          </button>
        </div>
        
        {showNewTabModal && (
          <NewTabModal
            onClose={() => setShowNewTabModal(false)}
            onCreate={handleCreateTab}
          />
        )}
      </div>
    )
  }
  
  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Tab Bar - No margins or padding */}
      <div className="bg-slate-800 border-b border-slate-700 flex items-center">
        {/* Tab List */}
        <div className="flex flex-1 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.name}
              className={`
                group flex items-center min-w-0 px-4 py-3 border-r border-slate-700 cursor-pointer transition-colors
                ${activeTabId === tab.id 
                  ? 'bg-slate-700 text-slate-100 border-b-2 border-blue-500' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }
              `}
              onClick={() => setActiveTab(tab.id)}
              onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
            >
              {/* Tab Name (editable) */}
              {editingTabId === tab.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleFinishEdit}
                  onKeyDown={handleEditKeyDown}
                  className="bg-slate-600 text-slate-100 px-2 py-1 rounded text-sm min-w-24 max-w-48"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span 
                  className="truncate max-w-48 text-sm font-medium"
                  onDoubleClick={() => handleStartEdit(tab.id, tab.name)}
                  title={tab.name}
                >
                  {tab.name}
                  {tab.isModified && (
                    <span className="ml-1 text-orange-400" title="Modified">●</span>
                  )}
                </span>
              )}
              
              {/* Close Button */}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="ml-2 opacity-0 group-hover:opacity-100 hover:bg-slate-600 rounded p-1 transition-all"
                  title="Close tab"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 4.586L10.293.293a1 1 0 111.414 1.414L7.414 6l4.293 4.293a1 1 0 01-1.414 1.414L6 7.414l-4.293 4.293a1 1 0 01-1.414-1.414L4.586 6 .293 1.707A1 1 0 011.707.293L6 4.586z"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* Add Tab Button */}
        <button
          onClick={() => setShowNewTabModal(true)}
          className="px-4 py-3 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors border-l border-slate-700"
          title="Create new unit"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z"/>
          </svg>
        </button>
      </div>
      
      {/* Tab Content - Full remaining height */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
      
      {/* New Tab Modal */}
      {showNewTabModal && (
        <NewTabModal
          onClose={() => setShowNewTabModal(false)}
          onCreate={handleCreateTab}
        />
      )}
    </div>
  )
}
