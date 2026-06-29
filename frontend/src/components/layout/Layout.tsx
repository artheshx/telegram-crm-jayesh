import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-56 overflow-y-auto">
        <div className="min-h-screen p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
