import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Truck, LayoutDashboard, PlusCircle, History, FileDown, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import NewSchedule from './pages/NewSchedule'
import ScheduleList from './pages/ScheduleList'
import AdminSettings from './pages/AdminSettings'

function Sidebar({ onClose }) {
  const location = useLocation()
  
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/novo', icon: PlusCircle, label: 'Novo Agendamento' },
    { path: '/historico', icon: History, label: 'Histórico' },
    { path: '/admin', icon: FileDown, label: 'Admin' },
  ]

  // Close sidebar on mobile when a link is clicked
  const handleLinkClick = () => {
    if (onClose) {
      onClose()
    }
  }
  
  return (
    <div className="w-64 bg-primary-900 text-white h-full flex flex-col">
      <div className="p-6 border-b border-primary-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold">LogSchedule</h1>
            <p className="text-xs text-primary-300">Agendamento Logístico</p>
          </div>
        </div>
        <button onClick={onClose} className="md:hidden text-primary-300 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link
                  onClick={handleLinkClick}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary-700 text-white' 
                      : 'text-primary-200 hover:bg-primary-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-primary-800">
        <div className="text-xs text-primary-400 text-center">
          v2.0.0 - Sistema de Agendamento
        </div>
      </div>
    </div>
  )
}

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-gray-100">
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transition-transform duration-300 ease-in-out transform md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      <div className="md:ml-64">
        <header className="md:hidden sticky top-0 bg-white shadow-sm z-20 flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Truck className="w-7 h-7 text-blue-500" />
            <h1 className="text-lg font-bold text-primary-900">LogSchedule</h1>
          </div>
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/novo" element={<NewSchedule />} />
            <Route path="/historico" element={<ScheduleList />} />
            <Route path="/admin" element={<AdminSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

const AppWithRouter = () => (
  <Router>
    <App />
  </Router>
)

export default AppWithRouter
