import { useState, useEffect } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Truck, Package, AlertTriangle, TrendingUp, X } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [companyFilter, setCompanyFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [profileFilter, setProfileFilter] = useState('')
  const [ufFilter, setUfFilter] = useState('')
  const [companies, setCompanies] = useState([])
  const [profiles, setProfiles] = useState([])
  const [ufs, setUfs] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [editDate, setEditDate] = useState('')
  const [editCategories, setEditCategories] = useState([])
  const [editCapacities, setEditCapacities] = useState([])
  const [editCapacitiesSpot, setEditCapacitiesSpot] = useState([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState(null)
  
  // load companies and UFs once
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [companiesRes, ufsRes] = await Promise.all([
          axios.get('/api/companies'),
          axios.get('/api/companies/ufs')
        ])
        setCompanies(companiesRes.data)
        setUfs(ufsRes.data)
      } catch (error) {
        console.error('Erro ao buscar dados iniciais:', error)
      }
    }
    fetchInitialData()
    // detect role from token
    try {
      const token = localStorage.getItem('admin_token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        setIsAdmin(payload.role === 'admin')
      }
    } catch (_e) {
      setIsAdmin(false)
    }
  }, [])

  // refresh metrics when any filter changes
  useEffect(() => {
    fetchMetrics()
  }, [companyFilter, startDate, endDate, profileFilter, ufFilter])

  // reload profiles when company filter changes (empty = all)
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const url = companyFilter ? `/api/profiles?company_id=${companyFilter}` : '/api/profiles'
        const res = await axios.get(url)
        setProfiles(res.data)
        // clear profile filter if it no longer exists
        if (profileFilter && !res.data.some(p => p.name === profileFilter)) {
          setProfileFilter('')
        }
      } catch (err) {
        console.error('Erro ao carregar perfis:', err)
      }
    }
    loadProfiles()
  }, [companyFilter])
  
  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (companyFilter) params.append('company_id', companyFilter)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      if (profileFilter) params.append('profile_name', profileFilter)
      if (ufFilter) params.append('uf', ufFilter)

      const response = await axios.get(`/api/dashboard/metrics?${params.toString()}`)
      setMetrics(response.data)
    } catch (error) {
      console.error('Erro ao buscar métricas:', error)
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (schedule) => {
    setEditingSchedule(schedule)
    setEditDate(schedule.schedule_date)
    setEditCategories(schedule.categories.map(c => ({ ...c })))
    setEditCapacities(schedule.capacities.map(c => ({ ...c })))
    setEditCapacitiesSpot(schedule.capacities_spot.map(c => ({ ...c })))
    setEditError(null)
    setEditModalOpen(true)
  }

  const closeEditModal = () => {
    setEditModalOpen(false)
    setEditingSchedule(null)
    setEditDate('')
    setEditCategories([])
    setEditCapacities([])
    setEditCapacitiesSpot([])
    setEditError(null)
  }

  const handleEditCategoryChange = (index, field, value) => {
    const copy = [...editCategories]
    copy[index] = { ...copy[index], [field]: field === 'count' ? parseInt(value) || 0 : value }
    setEditCategories(copy)
  }

  const handleEditCapacityChange = (index, value, spot=false) => {
    if (spot) {
      const copy = [...editCapacitiesSpot]
      copy[index] = { ...copy[index], vehicle_count: parseInt(value) || 0 }
      setEditCapacitiesSpot(copy)
    } else {
      const copy = [...editCapacities]
      copy[index] = { ...copy[index], vehicle_count: parseInt(value) || 0 }
      setEditCapacities(copy)
    }
  }

  const submitEdit = async () => {
    if (!editingSchedule) return

    // Client-side validation before sending
    // Ensure 'Perdidas' categories have a profile when count > 0
    for (const c of editCategories) {
      if (c.category_name === 'Perdidas' && c.count > 0) {
        if (!c.profile_name || c.profile_name.trim() === '') {
          setEditError('Informe o perfil do veículo para categorias Perdidas')
          return
        }
      }
      if (c.category_name === 'Indisponíveis' && c.count > 0) {
        const plates = c.lost_plates || []
        const filled = plates.filter(p => p && p.plate_number && p.plate_number.trim() !== '' && p.reason && p.reason.trim() !== '')
        if (filled.length !== c.count) {
          setEditError(`Informe ${c.count} placa(s) e motivo(s) para as viagens Indisponíveis`)
          return
        }
      }
    }

    // Ensure Spot/Parado total matches capacities_spot
    const spotCat = editCategories.find(c => c.category_name === 'Spot/Parado')
    if (spotCat) {
      const totalSpot = editCapacitiesSpot.reduce((s, cap) => s + (cap.vehicle_count || 0), 0)
        if (spotCat.count !== totalSpot) {
          setEditError(`A soma dos veículos em SPOT (${totalSpot}) deve ser igual à quantidade em Spot/Parado (${spotCat.count})`)
          return
        }
    }

    setSavingEdit(true)
    try {
      const token = localStorage.getItem('admin_token')
      const payload = {
        company_id: editingSchedule.company_id,
        uf: editingSchedule.uf,
        schedule_date: editDate,
        categories: editCategories.map(c => ({ category_name: c.category_name, count: c.count, profile_name: c.profile_name || '', lost_plates: c.lost_plates || [] })),
        capacities: editCapacities.map(c => ({ profile_name: c.profile_name, vehicle_count: c.vehicle_count })),
        capacities_spot: editCapacitiesSpot.map(c => ({ profile_name: c.profile_name, vehicle_count: c.vehicle_count })),
      }

      await axios.put(`/api/schedules/${editingSchedule.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

      closeEditModal()
      fetchMetrics()
    } catch (err) {
      console.error('Erro ao atualizar agendamento:', err)
      setEditError(err.response?.data?.detail || 'Erro ao atualizar')
    } finally {
      setSavingEdit(false)
    }
  }
  
  const formatKg = (kg) => {
    if (kg >= 1000000) {
      return `${(kg / 1000000).toFixed(1)}M`
    }
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)}K`
    }
    return kg.toString()
  }
  
  const formatKgFull = (kg) => {
    return kg.toLocaleString('pt-BR')
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Visão geral dos agendamentos</p>
      </div>
      
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="">Todas as empresas</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de Transporte</label>
          <select
            value={profileFilter}
            onChange={(e) => setProfileFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="">Todos os perfis</option>
            {profiles.map(profile => (
              <option key={profile.name} value={profile.name}>{profile.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
          <select
            value={ufFilter}
            onChange={(e) => setUfFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="">Todas as UFs</option>
            {ufs.map(uf => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
        </div>
          {editModalOpen && editingSchedule && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
                <button onClick={closeEditModal} className="absolute right-4 top-4 text-gray-500 hover:text-gray-800"><X /></button>
                <h3 className="text-lg font-semibold mb-4">Editar Agendamento</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                {editError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                    {editError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium">Categorias</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {editCategories.map((cat, idx) => (
                        <div key={idx} className="border p-3 rounded">
                          <div className="text-sm font-medium">{cat.category_name}</div>
                          <input type="number" min="0" value={cat.count || 0} onChange={(e) => handleEditCategoryChange(idx, 'count', e.target.value)} className="mt-2 w-full px-2 py-1 border rounded" />
                          {cat.category_name === 'Perdidas' && (
                            <select value={cat.profile_name || ''} onChange={(e) => handleEditCategoryChange(idx, 'profile_name', e.target.value)} className="mt-2 w-full px-2 py-1 border rounded">
                              <option value="">Selecione...</option>
                              {profiles.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium">Capacidades</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                      {editCapacities.map((cap, idx) => (
                        <div key={idx} className="border p-3 rounded">
                          <div className="text-sm font-medium">{cap.profile_name}</div>
                          <input type="number" min="0" value={cap.vehicle_count || 0} onChange={(e) => handleEditCapacityChange(idx, e.target.value, false)} className="mt-2 w-full px-2 py-1 border rounded" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium">Capacidades - SPOT</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                      {editCapacitiesSpot.map((cap, idx) => (
                        <div key={idx} className="border p-3 rounded">
                          <div className="text-sm font-medium">{cap.profile_name}</div>
                          <input type="number" min="0" value={cap.vehicle_count || 0} onChange={(e) => handleEditCapacityChange(idx, e.target.value, true)} className="mt-2 w-full px-2 py-1 border rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={closeEditModal} className="px-4 py-2 border rounded">Cancelar</button>
                  <button onClick={submitEdit} disabled={savingEdit} className="px-4 py-2 bg-primary-600 text-white rounded">{savingEdit ? 'Salvando...' : 'Salvar'}</button>
                </div>
              </div>
            </div>
          )}
      </div>
      
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Capacidade</p>
              <p className="text-2xl font-bold text-gray-800">{formatKg(metrics?.total_capacity_kg || 0)} kg</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Truck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Veículos</p>
              <p className="text-2xl font-bold text-gray-800">{metrics?.total_vehicles || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Viagens Perdidas</p>
              <p className="text-2xl font-bold text-gray-800">{metrics?.total_lost_trips || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Agendamentos</p>
              <p className="text-2xl font-bold text-gray-800">{metrics?.recent_schedules?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Capacity by Company */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Capacidade por Empresa (kg)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.capacity_by_company || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="company" />
                <YAxis />
                <Tooltip formatter={(value) => formatKgFull(value)} />
                <Bar dataKey="capacity_kg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Categories Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Distribuição por Categoria</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics?.categories_distribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="category"
                >
                  {(metrics?.categories_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* New Chart Row */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Realizado vs. Meta (Veículos)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.goal_fulfillment || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="company" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="realizado" fill="#3b82f6" name="Realizado" radius={[4, 4, 0, 0]} />
                <Bar dataKey="meta" fill="#10b981" name="Meta" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Recent Schedules */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Agendamentos Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veículos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacidade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categorias</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metrics?.recent_schedules?.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {schedule.schedule_date.split('-').reverse().join('/')}
                      {schedule.updated_at && (
                        <div className="text-xs text-gray-400">Atualizado em: {new Date(schedule.updated_at).toLocaleDateString('pt-BR')}</div>
                      )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                    {companies.find(c => c.id === schedule.company_id)?.name || `Empresa ${schedule.company_id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {schedule.total_vehicles}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatKgFull(schedule.total_capacity_kg)} kg
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex flex-wrap gap-1">
                      {schedule.categories.map((cat) => (
                        <span 
                          key={cat.id}
                          className={`group relative cursor-help px-2 py-1 rounded-full text-xs ${
                            cat.category_name === 'Perdidas' 
                              ? 'bg-red-100 text-red-700' 
                              : cat.category_name === 'Indisponíveis'
                              ? 'bg-amber-100 text-[#f59e0b]'
                              : cat.category_name === 'Spot/Parado'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {cat.category_name}: {cat.count}
                          
                          {/* Tooltip para Indisponíveis */}
                          {cat.category_name === 'Indisponíveis' && cat.lost_plates && cat.lost_plates.length > 0 && (
                            <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50">
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></div>
                              <p className="font-semibold text-gray-700 mb-2 border-b pb-1 text-left">Motivos ({cat.count})</p>
                              <div className="max-h-48 overflow-y-auto">
                                {cat.lost_plates.map((plate, idx) => (
                                  <div key={idx} className="text-left mb-1 last:mb-0 text-xs leading-tight">
                                    <span className="font-bold text-gray-800">{plate.plate_number || 'S/ Placa'}</span>: <span className="text-gray-600 italic">{plate.reason}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {isAdmin && (
                      <button
                        onClick={() => openEditModal(schedule)}
                        className="px-3 py-1 bg-primary-600 text-white rounded text-sm"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(!metrics?.recent_schedules || metrics.recent_schedules.length === 0) && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Nenhum agendamento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
