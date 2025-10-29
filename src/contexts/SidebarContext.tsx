import { createContext, useContext, useState, ReactNode } from 'react'

interface SidebarContextType {
  leftSidebarCollapsed: boolean
  setLeftSidebarCollapsed: (collapsed: boolean) => void
  leftSidebarWidth: number
  setLeftSidebarWidth: (width: number) => void
  sidebarContent: ReactNode
  setSidebarContent: (content: ReactNode) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(320)
  const [sidebarContent, setSidebarContent] = useState<ReactNode>(null)

  return (
    <SidebarContext.Provider
      value={{
        leftSidebarCollapsed,
        setLeftSidebarCollapsed,
        leftSidebarWidth,
        setLeftSidebarWidth,
        sidebarContent,
        setSidebarContent,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider')
  }
  return context
}

