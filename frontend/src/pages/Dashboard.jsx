import { useState, useEffect } from 'react'
import axios from 'axios'
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, Treemap } from 'recharts'
import { X, Plus, Trash2 } from 'lucide-react'
import { normalizeCategoryResponse, getFallbackCategories } from '../constants/categories'

const getFirstDayOfMonth = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

const getLastDayOfMonth = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const lastDay = new Date(year, month, 0).getDate()
  const formattedMonth = String(month).padStart(2, '0')
  return `${year}-${formattedMonth}-${String(lastDay).padStart(2, '0')}`
}

const CustomizedTreemapContent = (props) => {
  const { x, y, width, height, name, bg, text, value, percent } = props

  if (width < 35 || height < 20) return null

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: bg,
          stroke: '#fff',
          strokeWidth: 2,
          rx: 8,
          ry: 8,
        }}
      />
      {width > 65 && height > 35 && (
        <text
          x={x + 10}
          y={y + 22}
          fill={text}
          fontSize={11}
          fontWeight="bold"
          textAnchor="start"
          className="uppercase opacity-90"
        >
          {name}
        </text>
      )}
      {width > 50 && height > 45 && (
        <text
          x={x + 10}
          y={y + height - 26}
          fill={text}
          fontSize={16}
          fontWeight="bold"
          textAnchor="start"
        >
          {value}
        </text>
      )}
      {width > 50 && height > 24 && (
        <text
          x={x + 10}
          y={y + height - 10}
          fill={text}
          fontSize={10}
          fontWeight="bold"
          textAnchor="start"
          className="opacity-80"
        >
          {percent}%
        </text>
      )}
    </g>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null

  const grouped = {}
  
  payload.forEach((item) => {
    let companyName = item.name
    let isMeta = false
    
    if (companyName.startsWith('Meta ')) {
      companyName = companyName.replace('Meta ', '')
      isMeta = true
    } else if (companyName === 'Meta Diária') {
      companyName = 'Geral'
      isMeta = true
    } else if (companyName === 'Realizado') {
      companyName = 'Geral'
      isMeta = false
    }
    
    if (!grouped[companyName]) {
      grouped[companyName] = { realized: null, meta: null, colorRealized: null, colorMeta: null }
    }
    
    if (isMeta) {
      grouped[companyName].meta = item.value
      grouped[companyName].colorMeta = item.stroke || item.color
    } else {
      grouped[companyName].realized = item.value
      grouped[companyName].colorRealized = item.fill || item.color
    }
  })

  return (
    <div className="rounded-lg border border-[#c4c5d5] bg-white p-3 shadow-lg text-[13px]" style={{ minWidth: '180px' }}>
      <p className="mb-2 font-bold text-[#0b1c30]">{label}</p>
      <div className="space-y-3">
        {Object.entries(grouped).map(([companyName, data]) => (
          <div key={companyName} className="border-t border-gray-100 pt-2 first:border-0 first:pt-0">
            <p className="font-bold text-[#00288e]">{companyName}</p>
            <div className="ml-2 mt-1 space-y-0.5 font-medium text-gray-700">
              {data.realized !== null && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: data.colorRealized || '#00288e' }} />
                  <span>Realizado: <strong className="text-[#0b1c30]">{data.realized}</strong></span>
                </div>
              )}
              {data.meta !== null && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: data.colorMeta || '#ba1a1a' }} />
                  <span>Meta: <strong className="text-[#0b1c30]">{data.meta}</strong></span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const COLORS = [
  '#00288e', // Azul Logtudo
  '#006a60', // Teal/Verde escuro
  '#a25000', // Laranja/Amber
  '#653cbd', // Roxo/Violeta
  '#872d00', // Terracota
  '#0058be', // Azul médio
  '#606a16', // Verde Oliva
  '#475569', // Slate
]

function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [dailyEvolution, setDailyEvolution] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFiltersOpen, setDateFiltersOpen] = useState(false)
  const [companyFilter, setCompanyFilter] = useState('')
  const [startDate, setStartDate] = useState(getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(getLastDayOfMonth())
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
      setSchedules(schedulesRes.data)
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

    setDailyEvolution(data.slice(-30))
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

  const formatUf = (uf) => {
    const normalized = (uf || '').toString().trim().toUpperCase()
    if (normalized === 'BAHIA') return 'BA'
    if (normalized === 'PERNAMBUCO') return 'PE'
    if (normalized === 'CEARÁ' || normalized === 'CEARA') return 'CE'
    return uf
  }

  const formatNumber = (value) => (Number(value) || 0).toLocaleString('pt-BR')

  const formatDate = (value) => {
    if (!value) return ''
    return value.split('-').reverse().join('/')
  }

  const getCompanyName = (companyId) =>
    companies.find((company) => String(company.id) === String(companyId))?.name || `Empresa ${companyId}`

  const dateRangeLabel = () => {
    if (startDate && endDate) return `${formatDate(startDate)} - ${formatDate(endDate)}`
    if (startDate) return `Desde ${formatDate(startDate)}`
    if (endDate) return `Até ${formatDate(endDate)}`
    return 'Período: Todos'
  }

  const getStatusVisual = (categoryName) => {
    if (categoryName === 'Perdidas') return { bg: '#ffdad6', text: '#93000a' }
    if (categoryName === 'Indisponíveis') return { bg: '#872d00', text: '#ffffff' }
    if (categoryName === 'Spot/Parado') return { bg: '#d3e4fe', text: '#0b1c30' }
    if (categoryName === 'Spot disponibilizado') return { bg: '#2170e4', text: '#ffffff' }
    if (categoryName === 'Reentrega') return { bg: '#1e40af', text: '#ffffff' }
    if (categoryName === 'Diária') return { bg: '#d3e4fe', text: '#0b1c30' }
    return { bg: '#00288e', text: '#ffffff' }
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

  const capacityByCompany = metrics?.capacity_by_company || []
  const maxCompanyVehicles = Math.max(...capacityByCompany.map((item) => Number(item.vehicles) || 0), 1)
  const companyBars = capacityByCompany.map((item, index) => ({
    company: item.company,
    value: formatNumber(item.vehicles),
    width: `${Math.max(((Number(item.vehicles) || 0) / maxCompanyVehicles) * 100, item.vehicles ? 8 : 0)}%`,
    color: COLORS[index % COLORS.length],
  }))

  const categoryDistribution = metrics?.categories_distribution || []
  const totalStatusCount = categoryDistribution.reduce((sum, item) => sum + (Number(item.count) || 0), 0)
  const statusCards = categoryDistribution
    .map((item) => {
      const visual = getStatusVisual(item.category)
      const count = Number(item.count) || 0
      const percent = totalStatusCount ? (count / totalStatusCount) * 100 : 0
      return {
        label: item.category,
        value: `${Math.round(percent)}%`,
        count,
        percent,
        bg: visual.bg,
        text: visual.text,
        small: item.category.length > 10,
      }
    })
    .sort((a, b) => b.count - a.count)

  const filteredSchedulesForRegion = schedules.filter((schedule) => {
    if (!profileFilter) return true
    return (schedule.capacities || []).some((cap) => cap.profile_name === profileFilter)
  })

  const vehiclesByUf = filteredSchedulesForRegion.reduce((acc, schedule) => {
    const uf = formatUf(schedule.uf || 'N/A')
    acc[uf] = (acc[uf] || 0) + (Number(schedule.total_vehicles) || 0)
    return acc
  }, {})
  const stateNames = {
    SP: 'São Paulo',
    RJ: 'Rio de Janeiro',
    MG: 'Minas Gerais',
    BA: 'Bahia',
    PE: 'Pernambuco',
    CE: 'Ceará',
  }
  const maxStateVehicles = Math.max(...Object.values(vehiclesByUf), 1)
  const totalStateVehicles = Object.values(vehiclesByUf).reduce((sum, value) => sum + (Number(value) || 0), 0)
  const stateTiles = Object.entries(vehiclesByUf)
    .sort((a, b) => b[1] - a[1])
    .map(([code, value], index) => ({
      code,
      label: stateNames[code] || code,
      vehicles: Number(value) || 0,
      value: formatNumber(value),
      percent: totalStateVehicles ? Math.round(((Number(value) || 0) / totalStateVehicles) * 100) : 0,
      flexGrow: Math.max(Number(value) || 0, 1),
      flexBasis: `${Math.max(((Number(value) || 0) / maxStateVehicles) * 46, 18)}%`,
      minHeight: `${Math.max(92, 92 + ((Number(value) || 0) / maxStateVehicles) * 110)}px`,
      opacity: Math.max(0.42, 1 - index * 0.12),
      color: (Number(value) || 0) >= maxStateVehicles * 0.66
        ? '#00288e'
        : (Number(value) || 0) >= maxStateVehicles * 0.33
          ? '#0058be'
          : '#d3e4fe',
      text: (Number(value) || 0) >= maxStateVehicles * 0.33 ? '#ffffff' : '#0b1c30',
    }))
  const topStates = stateTiles.slice(0, 4)
  const topState = topStates[0]
  const topStateShare = topState && totalStateVehicles
    ? Math.round(((vehiclesByUf[topState.code] || 0) / totalStateVehicles) * 100)
    : 0

  const metricCards = [
    {
      label: 'Total Disponibilidade',
      value: formatNumber(totalAvailabilityVehicles),
      icon: 'inventory',
      accentClass: 'text-[#00288e]',
      betaText: 'Veículos',
    },
    {
      label: 'Dias Abaixo Meta',
      value: formatNumber(daysBelowGoal),
      icon: 'warning',
      accentClass: 'text-[#ba1a1a]',
      betaText: 'No período',
    },
    {
      label: 'Viagens Perdidas',
      value: formatNumber(metrics?.total_lost_trips || 0),
      icon: 'cancel',
      accentClass: 'text-[#802a00]',
      betaText: 'Total',
    },
    {
      label: 'Agendamentos',
      value: formatNumber(metrics?.recent_schedules?.length || 0),
      icon: 'event_available',
      accentClass: 'text-[#0058be]',
      betaText: 'Recentes',
    },
  ]

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[#f8f9ff]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#d3e4fe] border-b-[#00288e]" />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f9ff] text-[#0b1c30]" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-[32px] font-bold text-[#0b1c30]">Dashboard</h1>
          <p className="mt-1 text-[16px] text-[#444653]">Visão geral dos agendamentos e métricas operacionais</p>
        </div>

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-[#c4c5d5] bg-[#e5eeff] px-4 py-2">
            <span className="material-symbols-outlined text-sm text-[#444653]">filter_alt</span>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="cursor-pointer border-none bg-transparent text-[14px] text-[#0b1c30] focus:ring-0"
            >
              <option value="">Empresa: Todas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>Empresa: {company.name}</option>
              ))}
            </select>
            <div className="hidden h-4 w-[1px] bg-[#c4c5d5] sm:block" />
            <select
              value={profileFilter}
              onChange={(e) => setProfileFilter(e.target.value)}
              className="cursor-pointer border-none bg-transparent text-[14px] text-[#0b1c30] focus:ring-0"
            >
              <option value="">Transporte: Todos</option>
              {profiles.map((profile) => (
                <option key={profile.name} value={profile.name}>Transporte: {profile.name}</option>
              ))}
            </select>
            <div className="hidden h-4 w-[1px] bg-[#c4c5d5] sm:block" />
            <select
              value={ufFilter}
              onChange={(e) => setUfFilter(e.target.value)}
              className="cursor-pointer border-none bg-transparent text-[14px] text-[#0b1c30] focus:ring-0"
            >
              <option value="">UF: Todas</option>
              {ufs.map((uf) => (
                <option key={uf} value={uf}>UF: {formatUf(uf)}</option>
              ))}
            </select>
            <div className="hidden h-4 w-[1px] bg-[#c4c5d5] sm:block" />
            <button
              type="button"
              onClick={() => setDateFiltersOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full px-1 text-[14px] font-semibold text-[#0b1c30] hover:opacity-70"
            >
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              <span>{dateRangeLabel()}</span>
            </button>
          </div>
          {dateFiltersOpen && (
            <div className="absolute right-0 top-full z-20 mt-3 w-full min-w-[320px] rounded-xl border border-[#c4c5d5] bg-white p-4 shadow-xl sm:w-auto">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#444653]">
                  Data Inicial
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-[#c4c5d5] bg-[#f8f9ff] px-3 py-2 text-[14px] font-medium normal-case tracking-normal text-[#0b1c30] focus:border-[#00288e] focus:ring-[#00288e]"
                  />
                </label>
                <label className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#444653]">
                  Data Final
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-[#c4c5d5] bg-[#f8f9ff] px-3 py-2 text-[14px] font-medium normal-case tracking-normal text-[#0b1c30] focus:border-[#00288e] focus:ring-[#00288e]"
                  />
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="rounded-lg bg-[#e5eeff] px-3 py-2 text-[13px] font-bold text-[#00288e] hover:bg-[#d3e4fe]"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => setDateFiltersOpen(false)}
                  className="rounded-lg bg-[#00288e] px-3 py-2 text-[13px] font-bold text-white hover:bg-[#1e40af]"
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className="flex h-32 flex-col justify-between rounded-xl border border-[#c4c5d5] bg-[#f8f9ff] p-6 tonal-elevation"
          >
            <div className="flex items-start justify-between">
              <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#444653]">{card.label}</span>
              <span className={`${card.accentClass} material-symbols-outlined`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {card.icon}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-[32px] font-bold ${card.accentClass}`}>{card.value}</span>
              <span className="text-[12px] font-bold text-[#444653]">{card.betaText}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-12 gap-6">
        <div className="col-span-12 rounded-xl border border-[#c4c5d5] bg-[#f8f9ff] p-6 tonal-elevation lg:col-span-7">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-[20px] font-semibold text-[#0b1c30]">Disponibilidade por Empresa</h2>
            <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#00288e]">Dados reais</span>
          </div>
          <div className="space-y-4 pt-2">
            {companyBars.length > 0 ? companyBars.map((bar) => (
              <div key={bar.company} className="space-y-1">
                <div className="flex justify-between text-[14px] font-bold text-[#0b1c30]">
                  <span>{bar.company}</span>
                  <span>{bar.value}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-[#e5eeff]">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: bar.width, backgroundColor: bar.color }} />
                </div>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-[#c4c5d5] p-6 text-center text-[14px] font-semibold text-[#444653]">
                Nenhuma disponibilidade encontrada
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 rounded-xl border border-[#c4c5d5] bg-[#f8f9ff] p-6 tonal-elevation lg:col-span-5">
          <h2 className="mb-6 text-[20px] font-semibold text-[#0b1c30]">Distribuição por Status</h2>
          {statusCards.length > 0 ? (
            <div className="h-56 w-full rounded-lg overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={statusCards.map((status) => ({
                    name: status.label,
                    size: status.count,
                    bg: status.bg,
                    text: status.text,
                    value: status.value,
                    percent: Math.round(status.percent),
                  }))}
                  dataKey="size"
                  stroke="#fff"
                  content={<CustomizedTreemapContent />}
                />
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[#c4c5d5] text-[14px] font-semibold text-[#444653]">
              Nenhum status encontrado
            </div>
          )}
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-[#c4c5d5] bg-[#f8f9ff] p-6 tonal-elevation">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-[20px] font-semibold text-[#0b1c30]">Performance por Estado</h2>
            <p className="text-[14px] text-[#444653]">Volume de veículos operacionais por UF existente no sistema</p>
          </div>
          <div className="flex items-center gap-4 rounded-lg border border-[#c4c5d5] bg-white p-3">
            <div className="mr-2 text-[12px] font-bold text-[#444653]">LEGENDA:</div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-[#d3e4fe]" />
              <span className="text-[11px] font-bold">Baixo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-[#0058be]" />
              <span className="text-[11px] font-bold">Médio</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-[#00288e]" />
              <span className="text-[11px] font-bold">Alto</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 items-center gap-8">
          <div className="col-span-12 lg:col-span-7">
            {stateTiles.length > 0 ? (
              <div className="flex min-h-[360px] w-full flex-wrap content-stretch gap-2 rounded-xl bg-[#e5eeff]/55 p-3">
                {stateTiles.map((state) => (
                  <div
                    key={state.code}
                    className="flex min-w-[118px] flex-col justify-between rounded-xl p-4 shadow-sm transition-transform hover:-translate-y-0.5"
                    title={`${state.label}: ${state.value} veículos`}
                    aria-label={`${state.label}: ${state.value} veículos, ${state.percent}% do total por estado`}
                    style={{
                      backgroundColor: state.color,
                      color: state.text,
                      flexGrow: state.flexGrow,
                      flexBasis: state.flexBasis,
                      minHeight: state.minHeight,
                      opacity: state.opacity,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[28px] font-extrabold leading-none">{state.code}</span>
                      <span className="rounded-full bg-white/20 px-2 py-1 text-[11px] font-bold">{state.percent}%</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold leading-tight">{state.label}</p>
                      <p className="mt-1 font-mono text-[18px] font-bold">{state.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-dashed border-[#c4c5d5] bg-[#e5eeff]/55 p-6 text-center text-[14px] font-semibold text-[#444653]">
                Nenhum estado encontrado
              </div>
            )}
          </div>
          <div className="col-span-12 space-y-4 lg:col-span-5">
            <div className="rounded-xl border border-[#c4c5d5] bg-[#d3e4fe]/30 p-4">
              <h3 className="mb-3 text-[14px] font-bold text-[#00288e]">TOP ESTADOS (VEÍCULOS)</h3>
              <div className="space-y-3">
                {topStates.length > 0 ? topStates.map((state) => (
                  <div key={state.code} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: state.color, opacity: state.opacity }}
                      >
                        {state.code}
                      </div>
                      <span className="font-bold text-[#0b1c30]">{state.label}</span>
                    </div>
                    <div className="flex min-w-[96px] items-center justify-end gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e5eeff]">
                        <div
                          className="h-full rounded-full bg-[#00288e]"
                          style={{ width: `${((vehiclesByUf[state.code] || 0) / maxStateVehicles) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-[#00288e]">{state.value}</span>
                    </div>
                  </div>
                )) : (
                  <div className="py-6 text-center text-[14px] font-semibold text-[#444653]">
                    Nenhum estado encontrado
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-[#dde2ff]/30 p-3">
              <span className="material-symbols-outlined text-[#0058be]">info</span>
              <p className="text-[11px] font-medium leading-tight text-[#0b1c30]">
                {topState
                  ? `${topState.label} concentra ${topStateShare}% do volume filtrado por estado.`
                  : 'Aguardando dados estaduais para calcular a concentração de veículos.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-[#c4c5d5] bg-[#f8f9ff] p-6 tonal-elevation">
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-[20px] font-semibold text-[#0b1c30]">Evolução Diária: Realizado vs. Meta (Veículos)</h2>
            <p className="text-[14px] text-[#444653]">Performance de carregamento no período filtrado</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-4 rounded bg-[#00288e]" />
              <span className="text-[14px]">Realizado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-dashed border-[#ba1a1a]" />
              <span className="text-[14px]">Meta</span>
            </div>
          </div>
        </div>
        <div className="h-80 overflow-x-auto">
          <div className="h-full min-w-0 sm:min-w-[720px] lg:min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyEvolution}>
                <CartesianGrid stroke="#d3e4fe" strokeDasharray="3 3" />
                <XAxis dataKey="displayDate" stroke="#444653" />
                <YAxis stroke="#444653" />
                <Tooltip content={<CustomTooltip />} />
                {companyFilter ? (
                  <>
                    <Bar dataKey="realizado" fill="#00288e" name="Realizado" barSize={20} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="meta" stroke="#ba1a1a" name="Meta Diária" strokeWidth={3} dot={false} strokeDasharray="5 5" />
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

      <div className="overflow-hidden rounded-xl border border-[#c4c5d5] bg-[#f8f9ff] tonal-elevation">
        <div className="flex flex-col gap-3 border-b border-[#c4c5d5] p-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[20px] font-semibold text-[#0b1c30]">Agendamentos Recentes</h2>
          <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#444653]">
            {formatNumber(metrics?.recent_schedules?.length || 0)} registros
          </span>
        </div>
        <div className="px-4 pt-3 text-xs text-[#444653] sm:hidden">Arraste a tabela para o lado para ver todos os dados.</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left zebra-table">
            <thead>
              <tr className="border-b border-[#c4c5d5] bg-[#eff4ff] text-[11px] font-bold uppercase tracking-[0.16em] text-[#444653]">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">UF</th>
                <th className="px-6 py-4">Veículos</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4c5d5]/30 text-[14px]">
              {metrics?.recent_schedules?.map((schedule, rowIndex) => (
                <tr key={schedule.id}>
                  <td className="px-6 py-4 font-bold">
                    {formatDate(schedule.schedule_date)}
                    {schedule.updated_at && (
                      <div className="text-xs font-normal text-[#444653]/70">Atualizado em: {new Date(schedule.updated_at).toLocaleDateString('pt-BR')}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">{getCompanyName(schedule.company_id)}</td>
                  <td className="px-6 py-4">{formatUf(schedule.uf)}</td>
                  <td className="px-6 py-4 font-mono text-[#00288e]">{formatNumber(schedule.total_vehicles)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {schedule.categories.map((cat) => {
                        const visual = getStatusVisual(cat.category_name)
                        return (
                          <span
                            key={cat.id}
                            tabIndex={0}
                            className="group relative cursor-help rounded-full px-2.5 py-0.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#00288e]"
                            style={{ backgroundColor: visual.bg, color: visual.text }}
                          >
                            {cat.category_name}: {cat.count}
                            {cat.category_name === 'Indisponíveis' && cat.lost_plates && cat.lost_plates.length > 0 && (
                              <div className={`absolute left-1/2 z-50 hidden w-64 -translate-x-1/2 rounded-lg border border-[#c4c5d5] bg-white p-3 text-[#0b1c30] shadow-xl group-hover:block group-focus:block ${
                                rowIndex === 0 ? 'top-full mt-2' : 'bottom-full mb-2'
                              }`}>
                                <p className="mb-2 border-b pb-1 text-left font-semibold text-[#0b1c30]">Motivos ({cat.count})</p>
                                <div className="max-h-48 overflow-y-auto">
                                  {cat.lost_plates.map((plate, idx) => (
                                    <div key={idx} className="mb-1 text-left text-xs leading-tight last:mb-0">
                                      <span className="font-bold">{plate.plate_number || 'S/ Placa'}</span>: <span className="italic text-[#444653]">{plate.reason}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {cat.category_name === 'Perdidas' && (
                              <div className={`absolute left-1/2 z-50 hidden w-64 -translate-x-1/2 whitespace-normal rounded-lg border border-[#c4c5d5] bg-white p-3 text-[#0b1c30] shadow-xl group-hover:block group-focus:block ${
                                rowIndex === 0 ? 'top-full mt-2' : 'bottom-full mb-2'
                              }`}>
                                <div className="text-left text-xs">
                                  <p><span className="font-bold">Perfil:</span> {cat.profile_name || 'N/A'}</p>
                                  <p><span className="font-bold">Qtd:</span> {cat.count}</p>
                                  <p><span className="font-bold">Placa:</span> {cat.lost_plates?.[0]?.plate_number || 'N/A'}</p>
                                  <p><span className="font-bold">Motivo:</span> {cat.lost_plates?.[0]?.reason || 'N/A'}</p>
                                </div>
                              </div>
                            )}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openEditModal(schedule)}
                        className="rounded-lg p-2 text-[#00288e] transition-colors hover:bg-[#00288e]/10"
                        aria-label="Editar agendamento"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(!metrics?.recent_schedules || metrics.recent_schedules.length === 0) && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-[#444653]">
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
