import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Home, FileText, Database, Info, GripVertical } from 'lucide-react'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  onResize?: (width: number) => void
  children?: React.ReactNode
}

const routes = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/explorer', label: 'Explorer', icon: Database },
  { path: '/datasets', label: 'Datasets', icon: FileText },
  { path: '/about', label: 'About', icon: Info },
]

const MIN_WIDTH = 200
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 320

export default function Sidebar({ isCollapsed, onToggle, onResize, children }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const resizeHandleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!isCollapsed) {
        const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, e.clientX))
        setWidth(newWidth)
        onResize?.(newWidth)
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
    <>
      <div
        ref={sidebarRef}
        className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'w-16' : ''
        }`}
        style={{ 
          minHeight: '100vh',
          width: isCollapsed ? '4rem' : `${width}px`,
          position: 'relative'
        }}
      >
        {/* Fixed Header - Page Selector (always visible) */}
        <div className="flex items-center justify-between p-2 border-b border-gray-200 flex-shrink-0">
          {!isCollapsed && (
            <div className="flex-1">
              {/* Page Selector Dropdown */}
              <select
                value={currentPath}
                onChange={(e) => {
                  navigate({ to: e.target.value })
                }}
                className="w-full px-3 py-2 text-sm font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {routes.map((route) => {
                  const Icon = route.icon
                  return (
                    <option key={route.path} value={route.path}>
                      {route.label}
                    </option>
                  )
                })}
              </select>
              <div className="px-2 pt-3">
                <p className="text-sm font-semibold text-gray-700 tracking-wide">
                  Version {__APP_VERSION__}
                </p>
                {/* Subtitle for explorer */}
                {currentPath === '/explorer' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Load, store, and explore datasets locally
                  </p>
                )}
              </div>
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Scrollable Content Area */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        )}

        {/* Collapsed Navigation Icons */}
        {isCollapsed && (
          <div className="flex flex-col gap-2 p-2">
            {routes.map((route) => {
              const Icon = route.icon
              const isActive = currentPath === route.path || currentPath.startsWith(route.path + '/')
              return (
                <Link
                  key={route.path}
                  to={route.path}
                  className={`p-2 rounded-md transition-colors flex items-center justify-center ${
                    isActive
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={route.label}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              )
            })}
          </div>
        )}

        {/* Resize Handle */}
        {!isCollapsed && (
          <div
            ref={resizeHandleRef}
            onMouseDown={(e) => {
              e.preventDefault()
              setIsResizing(true)
            }}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 bg-gray-300 transition-colors z-10"
            style={{ touchAction: 'none' }}
          >
            <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-0.5">
              <GripVertical className="w-3 h-6 text-gray-500" />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
