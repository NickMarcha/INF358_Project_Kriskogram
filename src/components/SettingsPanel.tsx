import { useState } from 'react'
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'

interface SettingsPanelProps {
  isCollapsed: boolean
  onToggle: () => void
  children: React.ReactNode
  title?: string
}

export default function SettingsPanel({
  isCollapsed,
  onToggle,
  children,
  title = 'Settings',
}: SettingsPanelProps) {
  return (
    <div
      className={`bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-0' : 'w-96'
      } overflow-hidden`}
      style={{ minHeight: '100vh' }}
    >
      {/* Toggle Button */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center gap-2 flex-1">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
          aria-label={isCollapsed ? 'Expand settings' : 'Collapse settings'}
        >
          {isCollapsed ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Content Area */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      )}
    </div>
  )
}

