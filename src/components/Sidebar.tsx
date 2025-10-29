import { useState } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Home, FileText, Database, Info } from 'lucide-react'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  children?: React.ReactNode
}

const routes = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/explorer', label: 'Explorer', icon: Database },
  { path: '/datasets', label: 'Datasets', icon: FileText },
  { path: '/about', label: 'About', icon: Info },
]

export default function Sidebar({ isCollapsed, onToggle, children }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = location.pathname

  const currentRoute = routes.find(r => currentPath === r.path || currentPath.startsWith(r.path + '/'))

  return (
    <div
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-80'
      }`}
      style={{ minHeight: '100vh' }}
    >
      {/* Toggle Button */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200">
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
            {/* Subtitle for explorer */}
            {currentPath === '/explorer' && (
              <p className="text-xs text-gray-500 mt-1 px-2">
                Load, store, and explore datasets locally
              </p>
            )}
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

      {/* Content Area */}
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
    </div>
  )
}

