import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Settings, GripVertical } from 'lucide-react'

interface SettingsPanelProps {
  isCollapsed: boolean
  onToggle: () => void
  onResize?: (width: number) => void
  children: React.ReactNode
  title?: string
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
      {/* Collapsed State - Thin Clickable Bar */}
      {isCollapsed && (
        <div
          onClick={onToggle}
          className="w-full h-full bg-gray-100 hover:bg-blue-400 cursor-pointer transition-colors flex items-center justify-center group"
          style={{ width: `${COLLAPSED_WIDTH}px` }}
          title="Click to expand settings"
        >
          <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Settings className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
            <ChevronLeft className="w-3 h-3 text-gray-600 group-hover:text-blue-600" />
          </div>
        </div>
      )}

      {/* Expanded State */}
      {!isCollapsed && (
        <>
          {/* Fixed Header */}
          <div className="flex items-center justify-between p-2 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2 flex-1">
              <Settings className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            </div>
            <button
              onClick={onToggle}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
              aria-label="Collapse settings"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>

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
