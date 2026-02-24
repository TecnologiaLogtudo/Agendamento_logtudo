import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Truck, LayoutDashboard, PlusCircle, History, FileDown } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import NewSchedule from './pages/NewSchedule'
import ScheduleList from './pages/ScheduleList'
import AdminSettings from './pages/AdminSettings'

function Sidebar() {
  const location = useLocation()
  
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/novo', icon: PlusCircle, label: 'Novo Agendamento' },
    { path: '/historico', icon: History, label: 'Histórico' },
    { path: '/admin', icon: FileDown, label: 'Admin' },
  ]
  
  return (
    <div className="w-64 bg-primary-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-primary-800">
        <div className="flex items-center gap-3">
          <Truck className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold">LogSchedule</h1>
            <p className="text-xs text-primary-300">Agendamento Logístico</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link
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
  return (
    <Router>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/novo" element={<NewSchedule />} />
            <Route path="/historico" element={<ScheduleList />} />
            <Route path="/admin" element={<AdminSettings />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
