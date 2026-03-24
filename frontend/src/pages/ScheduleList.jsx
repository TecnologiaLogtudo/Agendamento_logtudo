import { useState, useEffect } from 'react'
import axios from 'axios'
import { FileDown, Filter, X, Plus, Trash2 } from 'lucide-react'
import { normalizeCategoryResponse, getFallbackCategories } from '../constants/categories'

function ScheduleList() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  
  // Filters
  const [companyFilter, setCompanyFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Edit state
  const [isAdmin, setIsAdmin] = useState(false)
  const [companies, setCompanies] = useState([])
  const [ufs, setUfs] = useState([])
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

  useEffect(() => {
    fetchSchedules()
    
    // Check admin role
    try {
      const token = localStorage.getItem('admin_token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        setIsAdmin(payload.role === 'admin')
      }
    } catch (_e) {
      setIsAdmin(false)
    }

    // Load profiles for edit modal
    const loadInitialData = async () => {
      try {
        const [companiesRes, ufsRes, catRes] = await Promise.all([
          axios.get('/api/companies'),
          axios.get('/api/companies/ufs'),
          axios.get('/api/categories')
        ])
        setCompanies(companiesRes.data)
        setUfs(ufsRes.data || [])
        const normalizedCats = normalizeCategoryResponse(catRes.data)
        setAllCategories(normalizedCats)
      } catch (err) {
        console.error('Erro ao carregar dados do modal de edição:', err)
        setAllCategories(getFallbackCategories())
      }
    }
    loadInitialData()
  }, [])
  
  const fetchSchedules = async () => {
    try {
      setLoading(true)
      let url = '/api/schedules'
      const params = []
      
      if (companyFilter) params.push(`company_id=${companyFilter}`)
      if (startDate) params.push(`start_date=${startDate}`)
      if (endDate) params.push(`end_date=${endDate}`)
      
      if (params.length > 0) url += '?' + params.join('&')
      
      const response = await axios.get(url)
      setSchedules(response.data)
    } catch (err) {
      console.error('Erro ao buscar agendamentos:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const handleFilter = (e) => {
    e.preventDefault()
    fetchSchedules()
  }
  
  const clearFilters = () => {
    setCompanyFilter('')
    setStartDate('')
    setEndDate('')
    fetchSchedules()
  }
  
  const handleExport = () => {
    // Exportação CSV Client-side
    const headers = ['Data', 'Empresa', 'Veículos', 'Disponibilidade (kg)', 'Status', 'Disponibilidade']
    const csvContent = [
      headers.join(';'),
      ...schedules.map(schedule => {
        const date = schedule.schedule_date.split('-').reverse().join('/')
        const company = getCompanyName(schedule.company_id)
        const categories = schedule.categories.map(c => 
          `${c.category_name}: ${c.count}${c.profile_name ? ` [${c.profile_name}]` : ''}`
        ).join(' | ')
        const profiles = schedule.capacities.map(c => 
          `${c.profile_name}: ${c.vehicle_count}`
        ).join(' | ')
        
        return [
          date,
          company,
          schedule.total_vehicles,
          schedule.total_capacity_kg,
          `"${categories}"`,
          `"${profiles}"`
        ].join(';')
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = `agendamentos_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }
  
  const getCompanyName = (id) => {
    const company = companies.find((c) => c.id === id)
    return company?.name || `Empresa ${id}`
  }
  
  const formatKg = (kg) => kg.toLocaleString('pt-BR')
  
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

    // Client-side validation
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
      fetchSchedules()
    } catch (err) {
      console.error('Erro ao atualizar agendamento:', err)
      setEditError(err.response?.data?.detail || 'Erro ao atualizar')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Histórico de Agendamentos</h1>
          <p className="text-gray-500">Lista de todos os agendamentos realizados</p>
        </div>
        
        <div className="flex gap-3 self-start md:self-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              showFilters 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <form onSubmit={handleFilter} className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Empresa
              </label>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Todas</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Fim
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Aplicar
              </button>
              
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Limpar
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <p className="text-lg mb-2">Nenhum agendamento encontrado</p>
            <p className="text-sm">Tente ajustar os filtros ou criar um novo agendamento</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UF
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Veículos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Disponibilidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Disponibilidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {schedule.schedule_date.split('-').reverse().join('/')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-800">
                        {getCompanyName(schedule.company_id)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {schedule.uf}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {schedule.total_vehicles}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatKg(schedule.total_capacity_kg)} kg
                    </td>
                    <td className="px-6 py-4">
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
                            {cat.category_name.split(' ')[0]}: {cat.count}
                            
                            {/* Tooltip para Indisponíveis */}
                            {cat.category_name === 'Indisponíveis' && cat.lost_plates && cat.lost_plates.length > 0 && (
                              <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50 whitespace-normal">
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

                            {/* Tooltip para Perdidas */}
                            {cat.category_name === 'Perdidas' && (
                              <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-40 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50 whitespace-normal">
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></div>
                                <div className="text-left text-xs">
                                  <p><span className="font-bold">Perfil:</span> {cat.profile_name || 'N/A'}</p>
                                  <p><span className="font-bold">Qtd:</span> {cat.count}</p>
                                </div>
                              </div>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {schedule.capacities.map((cap) => (
                          <span
                            key={cap.id}
                            className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700"
                          >
                            {cap.profile_name}: {cap.vehicle_count}
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
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Summary */}
      {schedules.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total de Registros</p>
            <p className="text-xl font-bold text-gray-800">{schedules.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total de Veículos</p>
            <p className="text-xl font-bold text-gray-800">
              {schedules.reduce((sum, s) => sum + s.total_vehicles, 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Total de Disponibilidade</p>
            <p className="text-xl font-bold text-gray-800">
              {formatKg(schedules.reduce((sum, s) => sum + s.total_capacity_kg, 0))} kg
            </p>
          </div>
        </div>
      )}

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

export default ScheduleList
