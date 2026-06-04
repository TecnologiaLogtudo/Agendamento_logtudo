import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, X } from 'lucide-react'
import { normalizeCategoryResponse, getFallbackCategories } from '../constants/categories'

const COLORS = {
  background: '#f8f9ff',
  surface: '#f8f9ff',
  surfaceBright: '#f8f9ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainerLowest: '#ffffff',
  outline: '#757684',
  outlineVariant: '#c4c5d5',
  primary: '#00288e',
  primaryContainer: '#1e40af',
  primaryFixed: '#dde1ff',
  secondary: '#0058be',
  secondaryFixed: '#d8e2ff',
  tertiary: '#611e00',
  tertiaryFixed: '#ffdbce',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#444653',
  onPrimary: '#ffffff',
  onSecondaryFixedVariant: '#004395',
}

const cardShadow = '0px 4px 12px rgba(30,64,175,0.05)'
const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']

function MaterialIcon({ children, className = '', fill = false, style = {} }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontVariationSettings: fill ? "'FILL' 1" : undefined, ...style }}
    >
      {children}
    </span>
  )
}

function ScheduleList() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [companyFilter, setCompanyFilter] = useState('')
  const [ufFilter, setUfFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

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
    allCategories.filter((c) => c.name !== 'Indisponíveis').forEach((cat) => {
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
          reason: cat.lost_plates?.[0]?.reason || '',
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
      categoryMap.set(cat.category_name, { ...base, ...cat })
    })

    return Array.from(categoryMap.values()).map((cat) =>
      cat.category_name === 'Perdidas' ? ensurePerdidasItems(cat) : cat
    )
  }

  const addPerdidasItem = (catIndex) => {
    setEditCategories((prev) => {
      const next = [...prev]
      const target = { ...next[catIndex] }
      target.items = [...(target.items || []), { count: 0, profile_name: '', plate: '', reason: '' }]
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
      if (field === 'count') item.count = parseInt(value, 10) || 0
      if (field === 'profile') item.profile_name = value
      if (field === 'plate') item.plate = value
      if (field === 'reason') item.reason = value
      items[itemIndex] = item
      target.items = items
      target.count = items.reduce((sum, row) => sum + (row.count || 0), 0)
      next[catIndex] = target
      return next
    })
  }

  useEffect(() => {
    fetchSchedules()

    try {
      const token = localStorage.getItem('admin_token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
        setIsAdmin(payload.role === 'admin')
      }
    } catch (_e) {
      setIsAdmin(false)
    }

    const loadInitialData = async () => {
      try {
        const [companiesRes, ufsRes, catRes] = await Promise.all([
          axios.get('/api/companies'),
          axios.get('/api/companies/ufs'),
          axios.get('/api/categories'),
        ])
        setCompanies(companiesRes.data)
        setUfs(ufsRes.data || [])
        setAllCategories(normalizeCategoryResponse(catRes.data))
      } catch (err) {
        console.error('Erro ao carregar dados do modal de edição:', err)
        setAllCategories(getFallbackCategories())
      }
    }
    loadInitialData()
  }, [])

  const fetchSchedules = async (filters = {}) => {
    try {
      setLoading(true)
      let url = '/api/schedules'
      const params = []

      const selectedCompanyFilter = filters.companyFilter ?? companyFilter
      const selectedUfFilter = filters.ufFilter ?? ufFilter
      const selectedStartDate = filters.startDate ?? startDate
      const selectedEndDate = filters.endDate ?? endDate

      if (selectedCompanyFilter) params.push(`company_id=${selectedCompanyFilter}`)
      if (selectedUfFilter) params.push(`uf=${selectedUfFilter}`)
      if (selectedStartDate) params.push(`start_date=${selectedStartDate}`)
      if (selectedEndDate) params.push(`end_date=${selectedEndDate}`)
      if (params.length > 0) url += `?${params.join('&')}`

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
    setUfFilter('')
    setStartDate('')
    setEndDate('')
    fetchSchedules({ companyFilter: '', ufFilter: '', startDate: '', endDate: '' })
  }

  const handleExport = () => {
    const headers = ['Data', 'Empresa', 'Veículos', 'Disponibilidade (kg)', 'Status', 'Disponibilidade']
    const csvContent = [
      headers.join(';'),
      ...schedules.map((schedule) => {
        const date = formatDate(schedule.schedule_date)
        const company = getCompanyName(schedule.company_id)
        const categories = (schedule.categories || [])
          .map((c) => `${c.category_name}: ${c.count}${c.profile_name ? ` [${c.profile_name}]` : ''}`)
          .join(' | ')
        const profiles = (schedule.capacities || [])
          .map((c) => `${c.profile_name}: ${c.vehicle_count}`)
          .join(' | ')

        return [
          date,
          company,
          schedule.total_vehicles,
          schedule.total_capacity_kg,
          `"${categories}"`,
          `"${profiles}"`,
        ].join(';')
      }),
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

  const formatKg = (kg) => Number(kg || 0).toLocaleString('pt-BR')

  const formatDate = (date) => {
    if (!date) return '-'
    const [year, month, day] = date.split('-')
    return year && month && day ? `${day}/${month}/${year}` : date
  }

  const formatTableDate = (date) => {
    if (!date) return '-'
    const parsed = new Date(`${date}T00:00:00`)
    const day = parsed.getDate().toString().padStart(2, '0')
    const month = parsed.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    return `${day} ${month}, 08:30`
  }

  const formatUf = (uf) => {
    const normalized = (uf || '').toString().trim().toUpperCase()
    if (normalized === 'BAHIA') return 'BA'
    if (normalized === 'PERNAMBUCO') return 'PE'
    if (normalized === 'CEARÁ' || normalized === 'CEARA') return 'CE'
    return uf
  }

  const getPrimaryCapacity = (schedule) =>
    (schedule.capacities || []).find((cap) => cap.vehicle_count > 0) || schedule.capacities?.[0]

  const getDominantStatus = (schedule) => {
    const categories = schedule.categories || []
    const dominant = categories.reduce((best, category) => {
      if (!best || (category.count || 0) > (best.count || 0)) return category
      return best
    }, null)
    return dominant?.category_name || 'Concluído'
  }

  const statusStyle = (status) => {
    if (status === 'Perdidas' || status === 'Cancelado') return { bg: '#fce8e6', color: '#c5221f', label: 'Cancelado' }
    if (status === 'Indisponíveis') return { bg: '#fff4e5', color: '#b26a00', label: 'Em Trânsito' }
    if (status?.includes('Spot')) return { bg: COLORS.surfaceContainer, color: COLORS.primary, label: status }
    return { bg: '#e6f4ea', color: '#137333', label: 'Concluído' }
  }

  const filteredSchedules = schedules.filter((schedule) => {
    if (!searchQuery.trim()) return true
    const haystack = [
      formatDate(schedule.schedule_date),
      getCompanyName(schedule.company_id),
      formatUf(schedule.uf),
      ...(schedule.categories || []).map((cat) => cat.category_name),
      ...(schedule.capacities || []).map((cap) => cap.profile_name),
    ].join(' ').toLowerCase()
    return haystack.includes(searchQuery.trim().toLowerCase())
  })

  const totalVehicles = schedules.reduce((sum, schedule) => sum + (schedule.total_vehicles || 0), 0)
  const totalCapacity = schedules.reduce((sum, schedule) => sum + (schedule.total_capacity_kg || 0), 0)
  const lostCount = schedules.reduce(
    (sum, schedule) =>
      sum + (schedule.categories || []).filter((cat) => cat.category_name === 'Perdidas').reduce((catSum, cat) => catSum + (cat.count || 0), 0),
    0
  )
  const successRate = totalVehicles > 0 ? Math.max(0, Math.round(((totalVehicles - lostCount) / totalVehicles) * 1000) / 10) : 0
  const averageCapacity = schedules.length > 0 ? Math.round(totalCapacity / schedules.length) : 0
  const dailyVehicleVolume = weekdayLabels.map((label, index) => {
    const daySchedules = schedules.filter((schedule) => {
      if (!schedule.schedule_date) return false
      const date = new Date(`${schedule.schedule_date}T00:00:00`)
      const mondayFirstDay = (date.getDay() + 6) % 7
      return mondayFirstDay === index
    })
    return {
      label,
      value: daySchedules.reduce((sum, schedule) => sum + (schedule.total_vehicles || 0), 0),
    }
  })
  const maxDailyVehicleVolume = Math.max(...dailyVehicleVolume.map((item) => item.value), 1)

  const kpiCards = [
    {
      label: 'Total Agendamentos',
      value: schedules.length.toLocaleString('pt-BR'),
      icon: 'confirmation_number',
      iconColor: COLORS.primary,
      iconBg: COLORS.primaryFixed,
      trend: '12%',
      trendColor: COLORS.onSecondaryFixedVariant,
      fill: '75%',
      barColor: COLORS.primary,
      info: 'Quantidade de registros retornados pela API de agendamentos com os filtros atuais aplicados.',
    },
    {
      label: 'Taxa de Sucesso',
      value: `${successRate}%`,
      icon: 'check_circle',
      iconColor: COLORS.secondary,
      iconBg: COLORS.secondaryFixed,
      trend: '0.5%',
      trendIcon: 'trending_flat',
      trendColor: COLORS.outline,
      fill: `${Math.min(100, successRate)}%`,
      barColor: COLORS.secondary,
      info: 'Percentual estimado de veículos sem status Perdidas: (total de veículos - viagens perdidas) dividido pelo total de veículos.',
    },
    {
      label: 'Volume Total (kg)',
      value: totalCapacity > 999999 ? `${(totalCapacity / 1000000).toFixed(1)}M` : formatKg(totalCapacity),
      icon: 'scale',
      iconColor: COLORS.tertiary,
      iconBg: COLORS.tertiaryFixed,
      trend: '4%',
      trendColor: COLORS.onSecondaryFixedVariant,
      fill: '60%',
      barColor: COLORS.tertiary,
      info: 'Soma de total_capacity_kg de todos os agendamentos carregados na página.',
    },
    {
      label: 'Custo Médio',
      value: `R$ ${formatKg(averageCapacity)}`,
      icon: 'payments',
      iconColor: COLORS.error,
      iconBg: COLORS.errorContainer,
      trend: '2.1%',
      trendColor: COLORS.error,
      fill: '40%',
      barColor: COLORS.error,
      info: 'Média simples de disponibilidade por agendamento: volume total em kg dividido pelo número de registros.',
    },
  ]

  const companySummary = companies
    .map((company) => {
      const companySchedules = schedules.filter((schedule) => schedule.company_id === company.id)
      const value = companySchedules.reduce((sum, schedule) => sum + (schedule.total_capacity_kg || 0), 0)
      return { name: company.name, value }
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)

  const maxCompanyValue = Math.max(...companySummary.map((item) => item.value), 1)
  const fallbackCompanySummary = [
    { name: 'Logística Alfa S.A.', value: 3450 },
    { name: 'TransBeta Brasil', value: 2120 },
    { name: 'Nacional Express', value: 1890 },
    { name: 'Sul Cargas LTDA', value: 980 },
  ]
  const companyBars = companySummary.length ? companySummary : fallbackCompanySummary

  const openEditModal = async (schedule) => {
    setEditingSchedule(schedule)
    setEditCompanyId(String(schedule.company_id || ''))
    setEditUf(schedule.uf || '')
    setEditDate(schedule.schedule_date)
    setEditCategories(buildEditCategories(schedule.categories || []))

    try {
      await loadEditProfiles(schedule.company_id, schedule.capacities || [])
    } catch (err) {
      console.error('Erro ao carregar perfis para edição:', err)
      setEditProfiles([])
      setEditCapacities(schedule.capacities || [])
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
    copy[index] = { ...copy[index], [field]: field === 'count' ? parseInt(value, 10) || 0 : value }
    setEditCategories(copy)
  }

  const handleEditCapacityChange = (index, value) => {
    const copy = [...editCapacities]
    copy[index] = { ...copy[index], vehicle_count: parseInt(value, 10) || 0 }
    setEditCapacities(copy)
  }

  const submitEdit = async () => {
    if (!editingSchedule) return
    if (!editCompanyId || !editUf || !editDate) {
      setEditError('Preencha empresa, UF e data do agendamento')
      return
    }

    for (const category of editCategories) {
      if (category.category_name === 'Perdidas') {
        const invalidItem = (category.items || []).find(
          (item) =>
            item.count > 0 &&
            (!item.profile_name || item.profile_name.trim() === '' || !item.plate || item.plate.trim() === '' || !item.reason || item.reason.trim() === '')
        )
        if (invalidItem) {
          setEditError('Informe o perfil do veículo, placa e motivo para todas as viagens perdidas')
          return
        }
        const profileNames = editProfiles.map((p) => p.name)
        const invalidProfile = (category.items || []).find((item) => item.count > 0 && !profileNames.includes(item.profile_name))
        if (invalidProfile) {
          setEditError(`Perfil selecionado "${invalidProfile.profile_name}" é inválido`)
          return
        }
      }
    }

    setSavingEdit(true)
    try {
      const token = localStorage.getItem('admin_token')
      const categoriesPayload = editCategories.flatMap((category) => {
        if (category.category_name === 'Perdidas') {
          return (category.items || [])
            .filter((item) => item.count > 0)
            .map((item) => ({
              category_name: category.category_name,
              count: item.count,
              profile_name: item.profile_name || '',
              lost_plates: item.plate && item.reason ? [{ plate_number: item.plate.trim().toUpperCase(), reason: item.reason.trim() }] : [],
            }))
        }
        if (category.count > 0) {
          return [
            {
              category_name: category.category_name,
              count: category.count,
              profile_name: category.profile_name || '',
              lost_plates: category.lost_plates || [],
            },
          ]
        }
        return []
      })

      await axios.put(
        `/api/schedules/${editingSchedule.id}`,
        {
          company_id: parseInt(editCompanyId, 10),
          uf: editUf,
          schedule_date: editDate,
          categories: categoriesPayload,
          capacities: editCapacities.map((cap) => ({ profile_name: cap.profile_name, vehicle_count: cap.vehicle_count })),
          capacities_spot: [],
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

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
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: COLORS.background, color: COLORS.onSurface, fontFamily: 'Hanken Grotesk, sans-serif' }}
    >
      <header
        className="flex h-16 w-full max-w-[1440px] mx-auto items-center justify-between border-b px-6 shadow-sm sticky top-0 z-10"
        style={{ backgroundColor: COLORS.surface, borderColor: COLORS.outlineVariant }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button className="md:hidden p-2" type="button" style={{ color: COLORS.onSurfaceVariant }}>
            <MaterialIcon>menu</MaterialIcon>
          </button>
          <h2 className="hidden md:block text-[20px] leading-7 font-semibold shrink-0" style={{ color: COLORS.onSurface }}>
            Histórico de Agendamentos
          </h2>
          <div className="relative max-w-md w-full ml-0 md:ml-8 hidden md:block">
            <MaterialIcon className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.outline }}>
              search
            </MaterialIcon>
            <input
              className="w-full rounded-[0.75rem] border py-2 pl-10 pr-4 text-[14px] leading-5 transition-shadow focus:outline-none focus:ring-1"
              placeholder="Buscar agendamentos, empresas, NFs..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ backgroundColor: COLORS.surfaceContainerLowest, borderColor: COLORS.outlineVariant, color: COLORS.onSurface }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 transition-colors hover:text-[#00288e]" type="button" style={{ color: COLORS.onSurfaceVariant }}>
            <MaterialIcon>notifications</MaterialIcon>
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.error }} />
          </button>
          <button
            className="hidden sm:block p-2 transition-colors hover:text-[#00288e]"
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            style={{ color: COLORS.onSurfaceVariant }}
          >
            <MaterialIcon>filter_list</MaterialIcon>
          </button>
          <button className="hidden sm:block p-2 transition-colors hover:text-[#00288e]" type="button" style={{ color: COLORS.onSurfaceVariant }}>
            <MaterialIcon>help</MaterialIcon>
          </button>
          <div className="hidden sm:block h-6 w-px mx-2" style={{ backgroundColor: COLORS.outlineVariant }} />
          <button
            className="hidden lg:block rounded-[0.375rem] px-3 py-1.5 text-[12px] leading-4 font-semibold transition-colors hover:bg-[#e5eeff]"
            type="button"
            style={{ color: COLORS.primary }}
          >
            Support
          </button>
          <button
            className="hidden sm:block rounded-[0.5rem] px-4 py-2 text-[12px] leading-4 font-semibold shadow-sm transition-colors hover:bg-[#1e40af]"
            type="button"
            style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary }}
          >
            New Entry
          </button>
          <div
            className="ml-2 h-8 w-8 cursor-pointer overflow-hidden rounded-full border shadow-sm flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: COLORS.secondary, borderColor: COLORS.outlineVariant, color: '#fefcff' }}
          >
            GL
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 md:p-8 flex flex-col gap-8">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className="group relative rounded-[0.5rem] border p-5 flex flex-col gap-2"
              style={{ backgroundColor: COLORS.surfaceContainerLowest, borderColor: COLORS.outlineVariant, boxShadow: cardShadow }}
            >
              <div
                className="pointer-events-none absolute left-5 right-5 top-4 z-20 translate-y-1 rounded-[0.5rem] border p-3 text-[12px] leading-4 opacity-0 shadow-lg transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
                style={{ backgroundColor: COLORS.surfaceContainerLowest, borderColor: COLORS.outlineVariant, color: COLORS.onSurfaceVariant }}
              >
                <span className="mb-1 block font-semibold" style={{ color: COLORS.onSurface }}>
                  Como interpretar
                </span>
                {card.info}
              </div>
              <div className="flex justify-between items-start">
                <p className="text-[12px] leading-4 font-semibold uppercase tracking-wider" style={{ color: COLORS.onSurfaceVariant }}>
                  {card.label}
                </p>
                <span className="rounded-[0.5rem] p-1.5 text-sm" style={{ color: card.iconColor, backgroundColor: card.iconBg }}>
                  <MaterialIcon>{card.icon}</MaterialIcon>
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <h3 className="text-[32px] leading-10 font-bold" style={{ color: COLORS.onSurface }}>
                  {card.value}
                </h3>
                <span className="flex items-center text-sm text-[14px] leading-5 font-normal" style={{ color: card.trendColor }}>
                  <MaterialIcon className="text-sm">{card.trendIcon || 'trending_up'}</MaterialIcon>
                  {card.trend}
                </span>
              </div>
              <div className="mt-auto h-1 w-full overflow-hidden rounded-[0.75rem]" style={{ backgroundColor: COLORS.surfaceContainer }}>
                <div className="h-full rounded-[0.75rem]" style={{ width: card.fill, backgroundColor: card.barColor }} />
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div
            className="relative flex min-h-[300px] flex-col overflow-hidden rounded-[0.5rem] border p-5"
            style={{ backgroundColor: COLORS.surfaceContainerLowest, borderColor: COLORS.outlineVariant, boxShadow: cardShadow }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-[20px] leading-7 font-semibold" style={{ color: COLORS.onSurface }}>
                  Volume Diário de Veículos
                </h3>
                <p className="text-[14px] leading-5" style={{ color: COLORS.onSurfaceVariant }}>
                  Total de veículos agendados por dia da semana
                </p>
              </div>
              <button type="button" style={{ color: COLORS.onSurfaceVariant }}>
                <MaterialIcon>more_vert</MaterialIcon>
              </button>
            </div>
            <div className="relative w-full flex-1">
              <div
                className="absolute inset-0 opacity-10"
                style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, ${COLORS.outline} 40px)`, backgroundSize: '100% 40px' }}
              />
              <div className="absolute bottom-0 left-0 flex h-1/2 w-full items-end justify-between px-2">
                {dailyVehicleVolume.map((day) => (
                  <div
                    key={day.label}
                    className="group/bar relative w-[8%] rounded-t-sm border-t-2 transition-colors hover:bg-[rgba(0,40,142,0.32)]"
                    style={{
                      height: `${Math.max(8, Math.round((day.value / maxDailyVehicleVolume) * 90))}%`,
                      backgroundColor: 'rgba(0,40,142,0.2)',
                      borderColor: COLORS.primary,
                    }}
                  >
                    <div
                      className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max -translate-x-1/2 translate-y-1 rounded-[0.5rem] border px-3 py-2 text-center text-[12px] leading-4 opacity-0 shadow-lg transition-all duration-150 group-hover/bar:translate-y-0 group-hover/bar:opacity-100"
                      style={{ backgroundColor: COLORS.surfaceContainerLowest, borderColor: COLORS.outlineVariant, color: COLORS.onSurface }}
                    >
                      <span className="block font-semibold">{day.label}</span>
                      <span style={{ color: COLORS.onSurfaceVariant }}>{day.value.toLocaleString('pt-BR')} veículos</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 flex justify-between px-2 text-[12px] leading-4 font-semibold" style={{ color: COLORS.outline }}>
              {dailyVehicleVolume.map((day) => (
                <span key={day.label}>{day.label}</span>
              ))}
            </div>
          </div>

          <div
            className="flex min-h-[300px] flex-col rounded-[0.5rem] border p-5"
            style={{ backgroundColor: COLORS.surfaceContainerLowest, borderColor: COLORS.outlineVariant, boxShadow: cardShadow }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[20px] leading-7 font-semibold" style={{ color: COLORS.onSurface }}>
                Distribuição por Empresa
              </h3>
              <button type="button" style={{ color: COLORS.onSurfaceVariant }}>
                <MaterialIcon>more_vert</MaterialIcon>
              </button>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-4">
              {companyBars.map((bar, index) => {
                const width = `${Math.max(8, Math.round((bar.value / maxCompanyValue) * 80))}%`
                const colors = [COLORS.secondary, COLORS.primary, COLORS.tertiary, COLORS.outline]
                return (
                  <div key={bar.name}>
                    <div className="mb-1 flex justify-between text-[14px] leading-5 font-normal" style={{ color: COLORS.onSurface }}>
                      <span>{bar.name}</span>
                      <span className="font-mono text-[14px] leading-5 font-medium" style={{ color: COLORS.onSurfaceVariant }}>
                        {formatKg(bar.value)} kg
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-[0.75rem]" style={{ backgroundColor: COLORS.surfaceContainer }}>
                      <div className="h-full rounded-[0.75rem]" style={{ width, backgroundColor: colors[index] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section
          className="flex flex-1 min-h-[500px] flex-col overflow-hidden rounded-[0.5rem] border"
          style={{ backgroundColor: COLORS.surfaceContainerLowest, borderColor: COLORS.outlineVariant, boxShadow: cardShadow }}
        >
          <div
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b p-4"
            style={{ backgroundColor: COLORS.surfaceBright, borderColor: COLORS.outlineVariant }}
          >
            <h3 className="flex items-center gap-2 text-[20px] leading-7 font-semibold" style={{ color: COLORS.onSurface }}>
              <MaterialIcon className="text-[#00288e]">list_alt</MaterialIcon>
              Registros Detalhados
            </h3>
            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
              <button
                className="flex cursor-pointer items-center gap-2 rounded-[0.5rem] border px-3 py-1.5 text-[14px] leading-5 font-normal transition-colors hover:border-[#00288e]"
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                style={{ backgroundColor: COLORS.surface, borderColor: COLORS.outlineVariant, color: COLORS.onSurfaceVariant }}
              >
                <MaterialIcon className="text-sm">calendar_today</MaterialIcon>
                <span>Últimos 30 Dias</span>
                <MaterialIcon className="ml-2 text-sm">expand_more</MaterialIcon>
              </button>
              <button
                className="flex cursor-pointer items-center gap-2 rounded-[0.5rem] border px-3 py-1.5 text-[14px] leading-5 font-normal transition-colors hover:border-[#00288e]"
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                style={{ backgroundColor: COLORS.surface, borderColor: COLORS.outlineVariant, color: COLORS.onSurfaceVariant }}
              >
                <MaterialIcon className="text-sm">filter_alt</MaterialIcon>
                <span>Status</span>
                <MaterialIcon className="ml-2 text-sm">expand_more</MaterialIcon>
              </button>
              <button
                className="ml-auto md:ml-2 flex items-center gap-2 rounded-[0.5rem] border px-3 py-1.5 text-[12px] leading-4 font-semibold transition-colors hover:bg-[#eff4ff]"
                type="button"
                onClick={handleExport}
                style={{ backgroundColor: COLORS.surface, borderColor: COLORS.outlineVariant, color: COLORS.onSurface }}
              >
                <MaterialIcon className="text-sm">download</MaterialIcon>
                Exportar CSV
              </button>
            </div>
          </div>

          {showFilters && (
            <form
              onSubmit={handleFilter}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 border-b p-4"
              style={{ backgroundColor: COLORS.surfaceContainerLow, borderColor: COLORS.outlineVariant }}
            >
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="rounded-[0.5rem] border px-3 py-2 text-[14px]"
                style={{ borderColor: COLORS.outlineVariant, color: COLORS.onSurface }}
              >
                <option value="">Empresa: Todas</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <select
                value={ufFilter}
                onChange={(e) => setUfFilter(e.target.value)}
                className="rounded-[0.5rem] border px-3 py-2 text-[14px]"
                style={{ borderColor: COLORS.outlineVariant, color: COLORS.onSurface }}
              >
                <option value="">UF: Todas</option>
                {ufs.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-[0.5rem] border px-3 py-2 text-[14px]"
                style={{ borderColor: COLORS.outlineVariant, color: COLORS.onSurface }}
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-[0.5rem] border px-3 py-2 text-[14px]"
                style={{ borderColor: COLORS.outlineVariant, color: COLORS.onSurface }}
              />
              <div className="flex gap-2">
                <button className="flex-1 rounded-[0.5rem] px-3 py-2 text-[12px] font-semibold" type="submit" style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary }}>
                  Aplicar
                </button>
                <button className="flex-1 rounded-[0.5rem] border px-3 py-2 text-[12px] font-semibold" type="button" onClick={clearFilters} style={{ borderColor: COLORS.outlineVariant }}>
                  Limpar
                </button>
              </div>
            </form>
          )}

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2" style={{ borderColor: COLORS.primary }} />
              </div>
            ) : filteredSchedules.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center" style={{ color: COLORS.onSurfaceVariant }}>
                <p className="mb-2 text-lg">Nenhum agendamento encontrado</p>
                <p className="text-sm">Tente ajustar os filtros ou criar um novo agendamento</p>
              </div>
            ) : (
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b" style={{ backgroundColor: COLORS.surfaceContainerLow, borderColor: COLORS.outlineVariant }}>
                    {['', 'Data/Hora', 'Empresa', 'UF', 'Tipo Veículo', 'Peso (kg)', 'Status', 'Ações'].map((heading, index) => (
                      <th
                        key={heading || 'select'}
                        className={`p-3 text-[12px] leading-4 font-semibold ${index === 0 ? 'w-12 text-center' : ''} ${index === 5 || index === 7 ? 'text-right' : ''} ${index === 6 ? 'text-center' : ''}`}
                        style={{ color: COLORS.onSurfaceVariant }}
                      >
                        {index === 0 ? <input className="h-4 w-4 rounded" type="checkbox" style={{ borderColor: COLORS.outlineVariant, accentColor: COLORS.primary }} /> : heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.map((schedule, rowIndex) => {
                    const capacity = getPrimaryCapacity(schedule)
                    const status = statusStyle(getDominantStatus(schedule))
                    return (
                      <tr
                        key={schedule.id}
                        className="h-12 border-b transition-colors duration-150 hover:bg-[#eff4ff]"
                        style={{ backgroundColor: rowIndex % 2 === 1 ? 'rgba(248,249,255,0.3)' : COLORS.surfaceContainerLowest, borderColor: 'rgba(196,197,213,0.5)' }}
                      >
                        <td className="p-3 text-center">
                          <input className="h-4 w-4 rounded" type="checkbox" style={{ borderColor: COLORS.outlineVariant, accentColor: COLORS.primary }} />
                        </td>
                        <td className="p-3 text-[14px] leading-5 font-normal" style={{ color: COLORS.onSurface }}>
                          {formatTableDate(schedule.schedule_date)}
                        </td>
                        <td className="p-3 text-[14px] leading-5 font-medium" style={{ color: COLORS.onSurface }}>
                          {getCompanyName(schedule.company_id)}
                        </td>
                        <td className="p-3 text-[14px] leading-5 font-normal" style={{ color: COLORS.onSurfaceVariant }}>
                          {formatUf(schedule.uf)}
                        </td>
                        <td className="p-3 text-[14px] leading-5 font-normal" style={{ color: COLORS.onSurfaceVariant }}>
                          {capacity?.profile_name || '-'}
                        </td>
                        <td className="p-3 text-right font-mono text-[14px] leading-5 font-medium" style={{ color: COLORS.onSurface }}>
                          {formatKg(schedule.total_capacity_kg)}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center rounded-[0.75rem] px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: status.bg, color: status.color }}>
                            {status.label}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button className="rounded p-1 transition-colors hover:bg-[#e5eeff]" title="Detalhes" type="button" style={{ color: COLORS.primary }}>
                            <MaterialIcon className="text-[20px]">visibility</MaterialIcon>
                          </button>
                          {isAdmin && (
                            <button
                              className="ml-1 rounded p-1 transition-colors hover:bg-[#e5eeff] hover:text-[#00288e]"
                              title="Editar"
                              type="button"
                              onClick={() => openEditModal(schedule)}
                              style={{ color: COLORS.onSurfaceVariant }}
                            >
                              <MaterialIcon className="text-[20px]">edit</MaterialIcon>
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div
            className="flex items-center justify-between border-t p-4"
            style={{ backgroundColor: COLORS.surfaceBright, borderColor: COLORS.outlineVariant }}
          >
            <p className="text-[14px] leading-5 font-normal" style={{ color: COLORS.onSurfaceVariant }}>
              Mostrando <span className="font-bold" style={{ color: COLORS.onSurface }}>1-{filteredSchedules.length}</span> de{' '}
              <span className="font-bold" style={{ color: COLORS.onSurface }}>{schedules.length}</span> registros
            </p>
            <div className="flex items-center gap-1">
              <button className="rounded p-1 opacity-50" type="button" disabled style={{ color: COLORS.outline }}>
                <MaterialIcon>chevron_left</MaterialIcon>
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded text-[12px] leading-4 font-semibold" type="button" style={{ backgroundColor: COLORS.primary, color: COLORS.onPrimary }}>
                1
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded text-[12px] leading-4 font-semibold transition-colors hover:bg-[#e5eeff]" type="button">
                2
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded text-[12px] leading-4 font-semibold transition-colors hover:bg-[#e5eeff]" type="button">
                3
              </button>
              <span className="px-2" style={{ color: COLORS.outline }}>...</span>
              <button className="rounded p-1 transition-colors hover:bg-[#e5eeff] hover:text-[#00288e]" type="button" style={{ color: COLORS.outline }}>
                <MaterialIcon>chevron_right</MaterialIcon>
              </button>
            </div>
          </div>
        </section>
      </main>

      {editModalOpen && editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[0.5rem] bg-white p-6">
            <button onClick={closeEditModal} className="absolute right-4 top-4 text-gray-500 hover:text-gray-800" type="button">
              <X />
            </button>
            <h3 className="mb-4 text-lg font-semibold">Editar Agendamento</h3>
            <div className="mb-4 rounded-[0.5rem] border p-4" style={{ borderColor: COLORS.outlineVariant }}>
              <h4 className="mb-3 text-base font-semibold" style={{ color: COLORS.onSurface }}>Informações Gerais</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="text-sm font-medium">
                  Empresa
                  <select value={editCompanyId} onChange={(e) => handleEditCompanyChange(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" required>
                    <option value="" disabled>Selecione</option>
                    {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  UF
                  <select value={editUf} onChange={(e) => setEditUf(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" required>
                    <option value="" disabled hidden>Escolha uma UF</option>
                    {ufs.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Data do Agendamento
                  <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" required />
                </label>
              </div>
            </div>
            {editError && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{editError}</div>}

            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Status</h4>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {editCategories.map((cat, idx) => (
                    <div key={`${cat.category_name}-${idx}`} className="rounded border p-3">
                      {cat.category_name === 'Perdidas' ? (
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm font-medium">{cat.category_name}</span>
                            <button type="button" onClick={() => addPerdidasItem(idx)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: COLORS.primary }}>
                              <Plus className="h-4 w-4" />
                              Adicionar linha
                            </button>
                          </div>
                          {(cat.items || []).map((item, itemIdx) => (
                            <div key={itemIdx} className="mb-4 flex flex-col gap-2 border-b border-gray-100 pb-4 last:mb-0 last:border-0 last:pb-0">
                              <div className="flex items-start gap-2">
                                <input type="number" min="0" value={item.count || ''} onChange={(e) => handlePerdidasItemChange(idx, itemIdx, 'count', e.target.value)} className="w-20 rounded border px-2 py-1 text-sm" placeholder="Qtd" />
                                <select value={item.profile_name || ''} onChange={(e) => handlePerdidasItemChange(idx, itemIdx, 'profile', e.target.value)} className="flex-1 rounded border px-2 py-1 text-sm">
                                  <option value="">Perfil...</option>
                                  {editProfiles.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                                </select>
                                {cat.items.length > 1 && (
                                  <button type="button" onClick={() => removePerdidasItem(idx, itemIdx)} className="p-1 text-red-500 hover:text-red-700">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                              <div className="flex items-start gap-2">
                                <input type="text" value={item.plate || ''} onChange={(e) => handlePerdidasItemChange(idx, itemIdx, 'plate', e.target.value)} className="flex-1 rounded border px-2 py-1 text-sm" placeholder="Placa" />
                                <input type="text" value={item.reason || ''} onChange={(e) => handlePerdidasItemChange(idx, itemIdx, 'reason', e.target.value)} className="flex-[2] rounded border px-2 py-1 text-sm" placeholder="Motivo" />
                              </div>
                            </div>
                          ))}
                          <div className="text-right text-xs text-gray-500">Total: {cat.count}</div>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm font-medium">{cat.category_name}</div>
                          <input type="number" min="0" value={cat.count || 0} onChange={(e) => handleEditCategoryChange(idx, 'count', e.target.value)} className="mt-2 w-full rounded border px-2 py-1" />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium">Disponibilidade</h4>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {editCapacities.map((cap, idx) => (
                    <div key={`${cap.profile_name}-${idx}`} className="rounded border p-3">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>{cap.profile_name}</span>
                        <span className="text-xs text-gray-500">{cap.weight || 0} kg/veículo</span>
                      </div>
                      <input type="number" min="0" value={cap.vehicle_count || 0} onChange={(e) => handleEditCapacityChange(idx, e.target.value)} className="mt-2 w-full rounded border px-2 py-1" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeEditModal} className="rounded border px-4 py-2" type="button">Cancelar</button>
              <button onClick={submitEdit} disabled={savingEdit} className="rounded px-4 py-2 text-white" type="button" style={{ backgroundColor: COLORS.primary }}>
                {savingEdit ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleList
