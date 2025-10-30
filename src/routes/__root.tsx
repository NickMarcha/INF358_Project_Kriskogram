import { Outlet, createRootRoute, redirect } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanstackDevtools } from '@tanstack/react-devtools'
import { SidebarProvider, useSidebar } from '../contexts/SidebarContext'
import Sidebar from '../components/Sidebar'

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
        <Outlet />
      </div>

      <TanstackDevtools
        config={{
          position: 'bottom-left',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </div>
  )
}
