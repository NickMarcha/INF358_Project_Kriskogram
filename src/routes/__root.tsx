import { lazy, Suspense } from 'react'
import { Outlet, createRootRoute, redirect, useLocation } from '@tanstack/react-router'
import { SidebarProvider, useSidebar } from '../contexts/SidebarContext'
import PatternsPanel from '../components/PatternsPanel'
import Sidebar from '../components/Sidebar'

// Lazy-load devtools only in development - excluded from production bundle
const DevtoolsWrapper = import.meta.env.DEV
  ? lazy(() => import('../components/DevtoolsWrapper').then((m) => ({ default: m.DevtoolsWrapper })))
  : () => null

export const Route = createRootRoute({
  notFoundComponent: () => {
    // Redirect unknown routes to home
    throw redirect({
      to: '/',
    })
  },
  component: RootComponent,
})

function RootComponent() {
  return (
    <SidebarProvider>
      <RootLayout />
    </SidebarProvider>
  )
}

function RootLayout() {
  const { leftSidebarCollapsed, setLeftSidebarCollapsed, setLeftSidebarWidth, sidebarContent } = useSidebar()
  const location = useLocation()
  const pathname = location.pathname || ''
  const isExplorer = pathname.includes('/explorer')

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Site-wide Left Sidebar */}
      <Sidebar
        isCollapsed={leftSidebarCollapsed}
        onToggle={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
        onResize={setLeftSidebarWidth}
      >
        {sidebarContent}
      </Sidebar>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ height: '100vh', maxHeight: '100vh' }}>
        {isExplorer ? (
          <Outlet />
        ) : (
          <div className="flex-1 min-h-0 h-full overflow-auto">
            <Outlet />
          </div>
        )}
        {/* Site-wide Patterns Drawer */}
        <PatternsPanel />
      </div>

      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <DevtoolsWrapper />
        </Suspense>
      )}
    </div>
  )
}
