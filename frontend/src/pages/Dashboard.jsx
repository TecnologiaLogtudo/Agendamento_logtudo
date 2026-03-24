import { useState, useEffect } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, Line } from 'recharts'
import { Truck, Package, AlertTriangle, TrendingUp, X, Plus, Trash2 } from 'lucide-react'
import { normalizeCategoryResponse, getFallbackCategories } from '../constants/categories'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [dailyEvolution, setDailyEvolution] = useState([])
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
  const [editCompanyId, setEditCompanyId] = useState('')
  const [editUf, setEditUf] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editProfiles, setEditProfiles] = useState([])
  const [editCategories, setEditCategories] = useState([])
  const [editCapacities, setEditCapacities] = useState([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState(null)
  const [allCategories, setAllCategories] = useState(getFallbackCategories())

  const mapProfiles = (rawProfiles) =>
    (rawProfiles || []).map((p) => ({
      name: p.name,
      weight: p.weight_kg ?? p.weight ?? 0,
    }))

  const mergeCapacitiesWithProfiles = (profileList, existingCaps = []) =>
    profileList.map((profile) => {
      const existing = existingCaps.find((c) => c.profile_name === profile.name)
      return {
        profile_name: profile.name,
        vehicle_count: existing?.vehicle_count || 0,
        weight: profile.weight,
      }
    })

  const loadEditProfiles = async (companyId, existingCaps = []) => {
    const url = companyId ? `/api/profiles?company_id=${companyId}` : '/api/profiles'
    const response = await axios.get(url)
    const mappedProfiles = mapProfiles(response.data)
    setEditProfiles(mappedProfiles)
    setEditCapacities(mergeCapacitiesWithProfiles(mappedProfiles, existingCaps))
  }

  const ensurePerdidasItems = (category) => {
    if (category.category_name !== 'Perdidas') return { ...category }
    const existingItems = (category.items || []).map((item) => ({
      count: item.count || 0,
      profile_name: item.profile_name || '',
      plate: item.plate || '',
      reason: item.reason || '',
    }))
    if (existingItems.length === 0) {
      if (category.count > 0) {
        existingItems.push({
          count: category.count,
          profile_name: category.profile_name || '',
          plate: category.lost_plates?.[0]?.plate_number || '',
          reason: category.lost_plates?.[0]?.reason || '',
        })
      } else {
        existingItems.push({ count: 0, profile_name: '', plate: '', reason: '' })
      }
    }
    const total = existingItems.reduce((sum, item) => sum + (item.count || 0), 0)
    return {
      ...category,
      items: existingItems,
      count: total,
      lost_plates: [],
      profile_name: '',
    }
  }

  const addPerdidasItem = (catIndex) => {
    setEditCategories((prev) => {
      const next = [...prev]
      const target = { ...next[catIndex] }
      const items = [...(target.items || [])]
      items.push({ count: 0, profile_name: '', plate: '', reason: '' })
      target.items = items
      next[catIndex] = target
      return next
    })
  }

  const buildEditCategories = (existingCats) => {
    const categoryMap = new Map()
    allCategories.filter(c => c.name !== 'Indisponíveis').forEach((cat) => {
      categoryMap.set(cat.name, {
        category_name: cat.name,
        count: 0,
        profile_name: '',
        lost_plates: [],
        items: cat.name === 'Perdidas' ? [{ count: 0, profile_name: '', plate: '', reason: '' }] : [],
      })
    })

    existingCats.forEach((cat) => {
      if (cat.category_name === 'Indisponíveis') return

      if (cat.category_name === 'Perdidas') {
        const base = categoryMap.get('Perdidas') ?? {
          category_name: 'Perdidas',
          count: 0,
          profile_name: '',
          lost_plates: [],
          items: [],
        }
        base.items = base.items || []
        base.items.push({
          count: cat.count,
          profile_name: cat.profile_name || '',
          plate: cat.lost_plates?.[0]?.plate_number || '',
          reason: cat.lost_plates?.[0]?.reason || ''
        })
        base.count = base.items.reduce((sum, item) => sum + (item.count || 0), 0)
        categoryMap.set('Perdidas', base)
        return
      }

      const base = categoryMap.get(cat.category_name) ?? {
        category_name: cat.category_name,
        count: 0,
        profile_name: '',
        lost_plates: [],
      }
      categoryMap.set(cat.category_name, {
        ...base,
        ...cat,
      })
    })

    return Array.from(categoryMap.values()).map((cat) =>
      cat.category_name === 'Perdidas' ? ensurePerdidasItems(cat) : cat
    )
  }

  const removePerdidasItem = (catIndex, itemIndex) => {
    setEditCategories((prev) => {
      const next = [...prev]
      const target = { ...next[catIndex] }
      const items = [...(target.items || [])]
      if (items.length <= 1) return next
      items.splice(itemIndex, 1)
      target.items = items
      target.count = items.reduce((sum, item) => sum + (item.count || 0), 0)
      next[catIndex] = target
      return next
    })
  }

  const handlePerdidasItemChange = (catIndex, itemIndex, field, value) => {
    setEditCategories((prev) => {
      const next = [...prev]
      const target = { ...next[catIndex] }
      const items = [...(target.items || [])]
      const item = { ...items[itemIndex] }
      if (field === 'count') {
        item.count = parseInt(value) || 0
      } else {
        if (field === 'profile') item.profile_name = value
        if (field === 'plate') item.plate = value
        if (field === 'reason') item.reason = value
      }
      items[itemIndex] = item
      target.items = items
      target.count = items.reduce((sum, row) => sum + (row.count || 0), 0)
      next[catIndex] = target
      return next
    })
  }
  
  // load companies and UFs once
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [companiesRes, ufsRes] = await Promise.all([
          axios.get('/api/companies'),
          axios.get('/api/companies/ufs'),
        ])
        setCompanies(companiesRes.data)
        setUfs(ufsRes.data)
      } catch (error) {
        console.error('Erro ao buscar dados iniciais:', error)
      }

      // Separately fetch admin data, can fail silently
      try {
        const catsRes = await axios.get('/api/categories')
        setAllCategories(normalizeCategoryResponse(catsRes.data))
      } catch (e) {
        console.error('Erro ao carregar categorias públicas:', e)
        setAllCategories(getFallbackCategories())
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
  }, [companyFilter, startDate, endDate, profileFilter, ufFilter, companies])

  // reload profiles when company filter changes (empty = all)
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const url = companyFilter ? `/api/profiles?company_id=${companyFilter}` : '/api/profiles'
        const res = await axios.get(url)
        setProfiles(mapProfiles(res.data))
        // clear profile filter if it no longer exists
        if (profileFilter && !res.data.some((p) => p.name === profileFilter)) {
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

      // Busca métricas e agendamentos em paralelo para montar o gráfico de evolução
      const [metricsRes, schedulesRes] = await Promise.all([
        axios.get(`/api/dashboard/metrics?${params.toString()}`),
        axios.get(`/api/schedules?${params.toString()}`)
      ])

      setMetrics(metricsRes.data)
      processDailyEvolution(schedulesRes.data, companies)
    } catch (error) {
      console.error('Erro ao buscar métricas:', error)
    } finally {
      setLoading(false)
    }
  }

  const processDailyEvolution = (schedules, allCompanies) => {
    if (!allCompanies || allCompanies.length === 0) {
      setDailyEvolution([])
      return
    }

    // Agrupa agendamentos por data
    const groupedByDate = {}

    // Se um filtro de empresa está ativo, mostramos apenas os dados dela.
    if (companyFilter) {
      const company = allCompanies.find(c => c.id == companyFilter)
      const meta = company ? company.vehicle_goal || 0 : 0

      schedules.forEach(s => {
        const date = s.schedule_date // YYYY-MM-DD
        if (!groupedByDate[date]) {
          groupedByDate[date] = { date, realizado: 0, meta: meta }
        }
        groupedByDate[date].realizado += s.total_vehicles
      })
    } else {
      // Se "Todas as empresas", agrupamos lado a lado.
      const companyMap = {}
      allCompanies.forEach(c => {
        companyMap[c.id] = { name: c.name, goal: c.vehicle_goal || 0 }
      })

      schedules.forEach(s => {
        const date = s.schedule_date
        if (!groupedByDate[date]) {
          groupedByDate[date] = { date }
          // Inicializa os valores para cada empresa nesta data
          allCompanies.forEach(c => {
            groupedByDate[date][c.name] = 0
            groupedByDate[date][`meta_${c.name}`] = c.vehicle_goal || 0
          })
        }
        const companyName = companyMap[s.company_id]?.name
        if (companyName) {
          groupedByDate[date][companyName] += s.total_vehicles
        }
      })
    }

    // Transforma em array, adiciona data de exibição e ordena
    const data = Object.values(groupedByDate).map(item => ({
      ...item,
      displayDate: item.date.split('-').reverse().slice(0, 2).join('/') // DD/MM
    })).sort((a, b) => a.date.localeCompare(b.date))

    setDailyEvolution(data)
  }

  const openEditModal = async (schedule) => {
    setEditingSchedule(schedule)
    setEditCompanyId(String(schedule.company_id || ''))
    setEditUf(schedule.uf || '')
    setEditDate(schedule.schedule_date)
    
    // Merge categories with all available categories
    const existingCats = schedule.categories || []
    setEditCategories(buildEditCategories(existingCats))

    // Merge capacities with profiles of selected company
    const existingCaps = schedule.capacities || []
    try {
      await loadEditProfiles(schedule.company_id, existingCaps)
    } catch (err) {
      console.error('Erro ao carregar perfis para edição:', err)
      setEditProfiles([])
      setEditCapacities(existingCaps)
    }
    
    setEditError(null)
    setEditModalOpen(true)
  }

  const handleEditCompanyChange = async (value) => {
    setEditCompanyId(value)
    try {
      await loadEditProfiles(value, editCapacities)
    } catch (err) {
      console.error('Erro ao atualizar perfis na edição:', err)
      setEditProfiles([])
      setEditCapacities([])
    }
  }

  const closeEditModal = () => {
    setEditModalOpen(false)
    setEditingSchedule(null)
    setEditCompanyId('')
    setEditUf('')
    setEditDate('')
    setEditProfiles([])
    setEditCategories([])
    setEditCapacities([])
    setEditError(null)
  }

  const handleEditCategoryChange = (index, field, value) => {
    const copy = [...editCategories]
    copy[index] = { ...copy[index], [field]: field === 'count' ? parseInt(value) || 0 : value }
    setEditCategories(copy)
  }

  const handleEditCapacityChange = (index, value) => {
      const copy = [...editCapacities]
      copy[index] = { ...copy[index], vehicle_count: parseInt(value) || 0 }
      setEditCapacities(copy)
  }

  const submitEdit = async () => {
    if (!editingSchedule) return
    if (!editCompanyId || !editUf || !editDate) {
      setEditError('Preencha empresa, UF e data do agendamento')
      return
    }

    // Client-side validation before sending
    // Ensure 'Perdidas' status have a profile when count > 0
    for (const c of editCategories) {
      if (c.category_name === 'Perdidas') {
        const invalidItem = (c.items || []).find(item => item.count > 0 && (!item.profile_name || item.profile_name.trim() === '' || !item.plate || item.plate.trim() === '' || !item.reason || item.reason.trim() === ''))
        if (invalidItem) {
          setEditError('Informe o perfil do veículo, placa e motivo para todas as viagens perdidas')
          return
        }
        const profileNames = editProfiles.map((p) => p.name)
        const invalidProfile = (c.items || []).find(item => item.count > 0 && !profileNames.includes(item.profile_name))
        if (invalidProfile) {
          setEditError(`Perfil selecionado "${invalidProfile.profile_name}" é inválido`)
          return
        }
      }
    }

    setSavingEdit(true)
    try {
      const token = localStorage.getItem('admin_token')
      const categoriesPayload = editCategories.flatMap((c) => {
        if (c.category_name === 'Perdidas') {
          return (c.items || [])
            .filter(item => item.count > 0)
            .map(item => ({
              category_name: c.category_name,
              count: item.count,
              profile_name: item.profile_name || '',
              lost_plates: item.plate && item.reason ? [{ plate_number: item.plate.trim().toUpperCase(), reason: item.reason.trim() }] : [],
            }))
        }
        if (c.count > 0) {
          return [{
            category_name: c.category_name,
            count: c.count,
            profile_name: c.profile_name || '',
            lost_plates: c.lost_plates || [],
          }]
        }
        return []
      })
      const payload = {
        company_id: parseInt(editCompanyId, 10),
        uf: editUf,
        schedule_date: editDate,
        categories: categoriesPayload,
        capacities: editCapacities.map((c) => ({ profile_name: c.profile_name, vehicle_count: c.vehicle_count })),
        capacities_spot: [],
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

  const totalAvailabilityVehicles = metrics?.capacity_by_company?.length
    ? metrics.capacity_by_company.reduce((sum, item) => sum + (Number(item.vehicles) || 0), 0)
    : (metrics?.total_vehicles || 0)

  const daysBelowGoal = dailyEvolution.reduce((count, day) => {
    if (companyFilter) {
      const realized = Number(day.realizado) || 0
      const goal = Number(day.meta) || 0
      return goal > 0 && realized < goal ? count + 1 : count
    }

    const totals = companies.reduce((acc, company) => {
      const companyName = company.name
      const realized = Number(day[companyName]) || 0
      const goal = Number(day[`meta_${companyName}`]) || 0
      acc.realized += realized
      if (goal > 0) {
        acc.goal += goal
      }
      return acc
    }, { realized: 0, goal: 0 })

    return totals.goal > 0 && totals.realized < totals.goal ? count + 1 : count
  }, 0)
  
  return (
    <div>
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Visão geral dos agendamentos</p>
      </div>
      
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
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
      </div>
      
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Disponibilidade</p>
              <p className="text-2xl font-bold text-gray-800">{totalAvailabilityVehicles}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Truck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Dias abaixo meta</p>
              <p className="text-2xl font-bold text-gray-800">{daysBelowGoal}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
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
        
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
        {/* Capacity by Company */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Disponibilidade por Empresa</h2>
          <div className="h-64 overflow-x-auto">
            <div className="h-full min-w-[560px] lg:min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.capacity_by_company || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="company" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="vehicles" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Distribuição por Status</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics?.categories_distribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={55}
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
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Evolução Diária: Realizado vs. Meta (Veículos)</h2>
          <div className="h-80 overflow-x-auto">
            <div className="h-full min-w-[720px] lg:min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyEvolution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayDate" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {companyFilter ? (
                    <>
                      <Bar dataKey="realizado" fill="#3b82f6" name="Realizado" barSize={20} radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="meta" stroke="#10b981" name="Meta Diária" strokeWidth={3} dot={false} legendType="none" />
                    </>
                  ) : (
                    <>
                      {companies.map((company, index) => (
                        <Bar key={company.id} dataKey={company.name} fill={COLORS[index % COLORS.length]} name={company.name} radius={[4, 4, 0, 0]} barSize={20} />
                      ))}
                      {companies.map((company, index) => (
                          <Line 
                              key={`meta-${company.id}`} 
                              type="monotone" 
                              dataKey={`meta_${company.name}`} 
                              stroke={COLORS[index % COLORS.length]} 
                              name={`Meta ${company.name}`} 
                              strokeWidth={2} 
                              dot={false} 
                              strokeDasharray="5 5"
                              legendType="none"
                          />
                      ))}
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Schedules */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Agendamentos Recentes</h2>
        </div>
        <div className="px-4 pt-3 text-xs text-gray-500 sm:hidden">Arraste a tabela para o lado para ver todos os dados.</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UF</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veículos</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disponibilidade</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metrics?.recent_schedules?.map((schedule, rowIndex) => (
                <tr key={schedule.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {schedule.schedule_date.split('-').reverse().join('/')}
                      {schedule.updated_at && (
                        <div className="text-xs text-gray-400">Atualizado em: {new Date(schedule.updated_at).toLocaleDateString('pt-BR')}</div>
                      )}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                    {companies.find(c => c.id === schedule.company_id)?.name || `Empresa ${schedule.company_id}`}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    {schedule.uf}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {schedule.total_vehicles}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatKgFull(schedule.total_capacity_kg)} kg
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex flex-wrap gap-1">
                      {schedule.categories.map((cat) => (
                        <span 
                          key={cat.id}
                          tabIndex={0}
                          className={`group relative cursor-help focus:outline-none focus:ring-2 focus:ring-primary-500 px-2 py-1 rounded-full text-xs ${
                            cat.category_name === 'Perdidas' 
                              ? 'bg-red-100 text-red-700' 
                              : cat.category_name === 'Indisponíveis'
                              ? 'bg-amber-100 text-[#f59e0b]'
                              : cat.category_name === 'Spot/Parado'
                              ? 'bg-gray-100 text-gray-700'
                              : cat.category_name === 'Spot disponibilizado'
                              ? 'bg-gray-100 text-gray-700'                              
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {cat.category_name}: {cat.count}
                          
                          {/* Tooltip para Indisponíveis */}
                          {cat.category_name === 'Indisponíveis' && cat.lost_plates && cat.lost_plates.length > 0 && (
                            <div className={`hidden group-hover:block group-focus:block absolute left-1/2 transform -translate-x-1/2 w-64 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50 ${
                              rowIndex === 0 ? 'top-full mt-2' : 'bottom-full mb-2'
                            }`}>
                              {rowIndex === 0 ? (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1 border-4 border-transparent border-b-white"></div>
                              ) : (
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></div>
                              )}
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

                          {/* Tooltip para Perdidas */}
                          {cat.category_name === 'Perdidas' && (
                            <div className={`hidden group-hover:block group-focus:block absolute left-1/2 transform -translate-x-1/2 w-64 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50 whitespace-normal ${
                              rowIndex === 0 ? 'top-full mt-2' : 'bottom-full mb-2'
                            }`}>
                              {rowIndex === 0 ? (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1 border-4 border-transparent border-b-white"></div>
                              ) : (
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></div>
                              )}
                              <div className="text-left text-xs">
                                <p><span className="font-bold">Perfil:</span> {cat.profile_name || 'N/A'}</p>
                                <p><span className="font-bold">Qtd:</span> {cat.count}</p>
                                <p><span className="font-bold">Placa:</span> {cat.lost_plates?.[0]?.plate_number || 'N/A'}</p>
                                <p><span className="font-bold">Motivo:</span> {cat.lost_plates?.[0]?.reason || 'N/A'}</p>
                              </div>
                            </div>
                          )}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
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
                  <td colSpan="6" className="px-3 sm:px-6 py-8 text-center text-gray-500">
                    Nenhum agendamento encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editModalOpen && editingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={closeEditModal} className="absolute right-4 top-4 text-gray-500 hover:text-gray-800"><X /></button>
            <h3 className="text-lg font-semibold mb-4">Editar Agendamento</h3>
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
              <h4 className="text-base font-semibold text-gray-800 mb-3">Informações Gerais</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                  <select
                    value={editCompanyId}
                    onChange={(e) => handleEditCompanyChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="" disabled>Selecione</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
                  <select
                    value={editUf}
                    onChange={(e) => setEditUf(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-primary-300 bg-primary-50 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="" disabled hidden>Escolha uma UF</option>
                    {ufs.map((uf) => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data do Agendamento</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>
            </div>
            {editError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                {editError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {editCategories.map((cat, idx) => (
                <div key={idx} className={`border p-3 rounded ${
                  ['Spot/Parado', 'Spot disponibilizado'].includes(cat.category_name)
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white'
                }`}>
                  {cat.category_name === 'Perdidas' ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{cat.category_name}</span>
                        <button
                          type="button"
                          onClick={() => addPerdidasItem(idx)}
                          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-semibold"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar linha
                        </button>
                      </div>
                      {(cat.items || []).map((item, itemIdx) => (
                        <div key={itemIdx} className="flex flex-col gap-2 mb-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                          <div className="flex gap-2 items-start">
                            <div className="w-20">
                            <input
                              type="number"
                              min="0"
                              value={item.count || ''}
                              onChange={(e) => handlePerdidasItemChange(idx, itemIdx, 'count', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Qtd"
                            />
                          </div>
                          <div className="flex-1">
                            <select
                              value={item.profile_name || ''}
                              onChange={(e) => handlePerdidasItemChange(idx, itemIdx, 'profile', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="">Perfil...</option>
                              {editProfiles.map((p) => (
                                <option key={p.name} value={p.name}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          {cat.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePerdidasItem(idx, itemIdx)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2 items-start">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={item.plate || ''}
                              onChange={(e) => handlePerdidasItemChange(idx, itemIdx, 'plate', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Placa"
                            />
                          </div>
                          <div className="flex-[2]">
                            <input
                              type="text"
                              value={item.reason || ''}
                              onChange={(e) => handlePerdidasItemChange(idx, itemIdx, 'reason', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Motivo"
                            />
                          </div>
                        </div>
                      </div>
                      ))}
                      <div className="text-xs text-gray-500 text-right">
                        Total: {cat.count}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm font-medium">{cat.category_name}</div>
                      <input type="number" min="0" value={cat.count || 0} onChange={(e) => handleEditCategoryChange(idx, 'count', e.target.value)} className="mt-2 w-full px-2 py-1 border rounded" />
                    </>
                  )}
                </div>
              ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium">Disponibilidade</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                  {editCapacities.map((cap, idx) => (
                    <div key={idx} className="border p-3 rounded">
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span>{cap.profile_name}</span>
                        <span className="text-xs text-gray-500">{cap.weight || 0} kg/veículo</span>
                      </div>
                      <input type="number" min="0" value={cap.vehicle_count || 0} onChange={(e) => handleEditCapacityChange(idx, e.target.value)} className="mt-2 w-full px-2 py-1 border rounded" />
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
  )
}

export default Dashboard
