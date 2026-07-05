import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="flex min-h-screen bg-bg-primary lg:h-screen lg:overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:ml-56">
        <div className="min-h-screen px-4 py-5 pt-20 sm:px-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
