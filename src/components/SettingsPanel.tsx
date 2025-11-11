import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Settings, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'

interface SettingsPanelProps {
  isCollapsed: boolean
  onToggle: () => void
  onResize?: (width: number) => void
  children: React.ReactNode
  title?: string
  bottomContent?: React.ReactNode
}

const MIN_WIDTH = 200
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 384
const COLLAPSED_WIDTH = 4 // 4px = 1rem for thin bar

export default function SettingsPanel({
  isCollapsed,
  onToggle,
  onResize,
  children,
  title = 'Settings',
  bottomContent,
}: SettingsPanelProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const resizeHandleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!isCollapsed) {
        const panelRect = panelRef.current?.getBoundingClientRect()
        if (panelRect) {
          const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - e.clientX))
          setWidth(newWidth)
          onResize?.(newWidth)
        }
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, isCollapsed, onResize])

  return (
    <div
      ref={panelRef}
      className={`bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ${
        isCollapsed ? '' : ''
      } overflow-hidden relative`}
      style={{ 
        minHeight: '100vh',
        width: isCollapsed ? `${COLLAPSED_WIDTH}px` : `${width}px`,
      }}
    >
      {/* Collapsed State - Thin Clickable Bar with Bottom Icon */}
      {isCollapsed && (
        <>
          <button
            type="button"
            onClick={onToggle}
            className="w-full h-full bg-gray-100 hover:bg-blue-400 cursor-pointer transition-colors"
            style={{ width: `${COLLAPSED_WIDTH}px` }}
            title="Click to expand settings"
            aria-label="Expand settings"
          />
          {/* Fixed Settings Icon in Bottom Right Corner */}
          <button
            type="button"
            onClick={onToggle}
            className="fixed bottom-4 right-4 z-50 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg cursor-pointer transition-all hover:scale-110 flex items-center justify-center"
            style={{ width: '48px', height: '48px' }}
            title="Open visualization settings"
            aria-label="Open visualization settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Expanded State */}
      {!isCollapsed && (
        <>
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>

          {/* Bottom Content (e.g., visualization type selector) */}
          {bottomContent && (
            <div className="flex-shrink-0 border-t border-gray-200 bg-white">
              {bottomContent}
            </div>
          )}

          {/* Fixed Footer */}
          <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center justify-between p-2 border-t border-gray-200 flex-shrink-0 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Collapse settings"
          >
            <div className="flex items-center gap-2 flex-1">
              <Settings className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{title}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
          </button>

          {/* Resize Handle */}
          <div
            ref={resizeHandleRef}
            onMouseDown={(e) => {
              e.preventDefault()
              setIsResizing(true)
            }}
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-blue-400 bg-gray-300 transition-colors z-10"
            style={{ touchAction: 'none' }}
          >
            <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-0.5">
              <GripVertical className="w-3 h-6 text-gray-500" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
