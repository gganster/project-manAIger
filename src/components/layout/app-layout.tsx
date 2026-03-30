import { useState } from "react"
import { Sidebar } from "./sidebar"
import { AppHeader } from "./header"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function toggleSidebar() {
    setSidebarOpen((prev) => !prev)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onToggle={toggleSidebar} />

      <div className="flex flex-1 flex-col overflow-hidden md:ml-[250px]">
        <AppHeader onMenuToggle={toggleSidebar} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
