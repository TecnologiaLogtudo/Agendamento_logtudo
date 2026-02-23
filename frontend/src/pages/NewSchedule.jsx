import { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Trash2, Save, AlertCircle, LogOut } from 'lucide-react'
import AuthModal from '../components/AuthModal'

const PROFILES = [
  { name: 'HR', weight: 1500 },
  { name: '3/4', weight: 3500 },
  { name: 'Toco', weight: 7000 },
  { name: 'Truck', weight: 14000 },
]

const CATEGORIES = [
  'Carros em rota',
  'Reentrega',
  'Em viagem',
  'Indisponíveis',
  'Diária',
  'Spot/Parado',
  'Perdidas',
]

const UFS = ['BAHIA', 'CEARÁ', 'PERNAMBUCO']


function NewSchedule() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('admin_token'))
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  // Form state
  const [companyId, setCompanyId] = useState('')
  const [uf, setUf] = useState('MG')
  const [scheduleDate, setScheduleDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  
  const [categories, setCategories] = useState(
    CATEGORIES.map((cat) => ({ name: cat, count: 0, plates: [] }))
  )
  
  const [capacities, setCapacities] = useState(
    PROFILES.map((p) => ({ name: p.name, weight: p.weight, count: 0 }))
  )
  
  const [capacitiesSpot, setCapacitiesSpot] = useState(
    PROFILES.map((p) => ({ name: p.name, weight: p.weight, count: 0 }))
  )
  
  useEffect(() => {
    fetchCompanies()
  }, [])
  
  const handleAuth = (token) => {
    localStorage.setItem('admin_token', token)
    setAuthToken(token)
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setAuthToken(null)
  }

  const fetchCompanies = async () => {
    try {
      const response = await axios.get('/api/companies')
      setCompanies(response.data)
      if (response.data.length > 0) {
        setCompanyId(response.data[0].id)
      }
    } catch (err) {
      console.error('Erro ao buscar empresas:', err)
      setError('Erro ao carregar empresas')
    } finally {
      setLoading(false)
    }
  }
  
  const handleCategoryChange = (index, value) => {
    const newCategories = [...categories]
    newCategories[index].count = parseInt(value) || 0
    
    // Reset plates if count is 0
    if (newCategories[index].count === 0) {
      newCategories[index].plates = []
    }
    // Initialize plates array if category is "Indisponíveis" and count > 0
    else if (newCategories[index].name === 'Indisponíveis' && newCategories[index].plates.length === 0) {
      newCategories[index].plates = [{ plate: '', reason: '' }]
    }
    
    setCategories(newCategories)
  }
  
  const handlePlateChange = (catIndex, plateIndex, value) => {
    const newCategories = [...categories]
    newCategories[catIndex].plates[plateIndex].plate = value
    setCategories(newCategories)
  }

  const handlePlateReasonChange = (catIndex, plateIndex, value) => {
    const newCategories = [...categories]
    newCategories[catIndex].plates[plateIndex].reason = value
    setCategories(newCategories)
  }
  
  const addPlate = (catIndex) => {
    const newCategories = [...categories]
    newCategories[catIndex].count += 1
    newCategories[catIndex].plates.push({ plate: '', reason: '' })
    setCategories(newCategories)
  }
  
  const removePlate = (catIndex, plateIndex) => {
    const newCategories = [...categories]
    newCategories[catIndex].count -= 1
    newCategories[catIndex].plates.splice(plateIndex, 1)
    setCategories(newCategories)
  }
  
  const handleCapacityChange = (index, value) => {
    const newCapacities = [...capacities]
    newCapacities[index].count = parseInt(value) || 0
    setCapacities(newCapacities)
  }
  
  const handleCapacitySpotChange = (index, value) => {
    const newCapacitiesSpot = [...capacitiesSpot]
    newCapacitiesSpot[index].count = parseInt(value) || 0
    setCapacitiesSpot(newCapacitiesSpot)
  }
  
  const calculateTotalCapacity = () => {
    return capacities.reduce((total, cap) => {
      return total + (cap.count * cap.weight)
    }, 0)
  }
  
  const calculateTotalCapacitySpot = () => {
    return capacitiesSpot.reduce((total, cap) => {
      return total + (cap.count * cap.weight)
    }, 0)
  }
  
  const calculateTotalVehicles = () => {
    return capacities.reduce((total, cap) => total + cap.count, 0)
  }
  
  const calculateTotalVehiclesSpot = () => {
    return capacitiesSpot.reduce((total, cap) => total + cap.count, 0)
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    // Validation for unavailable category
    const lostCategory = categories.find(c => c.name === 'Indisponíveis')
    if (lostCategory && lostCategory.count > 0) {
      const filledPlates = lostCategory.plates.filter(p => p.plate.trim() !== '' && p.reason.trim() !== '')
      if (filledPlates.length !== lostCategory.count) {
        setError(`Informe ${lostCategory.count} placa(s) e motivo(s) para as viagens indisponíveis`)
        return
      }
    }
    
    // Validation for Spot/Parado category
    const spotCategory = categories.find(c => c.name === 'Spot/Parado')
    const spotVehiclesCount = calculateTotalVehiclesSpot()
    if (spotCategory && spotCategory.count > 0) {
      if (spotVehiclesCount !== spotCategory.count) {
        setError(`A soma dos veículos em "Capacidade de Carga - SPOT" (${spotVehiclesCount}) deve ser igual à quantidade em "Spot/Parado" (${spotCategory.count})`)
        return
      }
    }
    
    const hasCategories = categories.some(c => c.count > 0)
    const hasCapacities = capacities.some(c => c.count > 0)
    
    if (!hasCategories && !hasCapacities) {
      setError('Informe pelo menos uma categoria ou capacidade')
      return
    }
    
    if (!authToken) {
      setError('Erro de autenticação. Recarregue a página.')
      return
    }

    setSaving(true)
    
    try {
      const payload = {
        company_id: parseInt(companyId),
        uf: uf,
        schedule_date: scheduleDate,
        categories: categories
          .filter(c => c.count > 0)
          .map(c => ({
            category_name: c.name,
            count: c.count,
            lost_plates: c.name === 'Indisponíveis' 
              ? c.plates
                  .filter(p => p.plate.trim() !== '' && p.reason.trim() !== '')
                  .map(p => ({ plate_number: p.plate.trim().toUpperCase(), reason: p.reason.trim() }))
              : []
          })),
        capacities: capacities
          .filter(c => c.count > 0)
          .map(c => ({
            profile_name: c.name,
            vehicle_count: c.count
          })),
        capacities_spot: capacitiesSpot
          .filter(c => c.count > 0)
          .map(c => ({
            profile_name: c.name,
            vehicle_count: c.count
          }))
      }
      
      await axios.post('/api/schedules', payload, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      setSuccess('Agendamento salvo com sucesso!')
      
      // Reset form
      setCategories(CATEGORIES.map((cat) => ({ name: cat, count: 0, plates: [] })))
      setCapacities(PROFILES.map((p) => ({ name: p.name, weight: p.weight, count: 0 })))
      setCapacitiesSpot(PROFILES.map((p) => ({ name: p.name, weight: p.weight, count: 0 })))
      
    } catch (err) {
      console.error('Erro ao salvar:', err)
      if (err.response?.status === 401) {
        handleLogout()
        setError('Sessão expirada. Faça login novamente.')
      } else {
        setError(err.response?.data?.detail || 'Erro ao salvar agendamento')
      }
    } finally {
      setSaving(false)
    }
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
      {!authToken && <AuthModal onAuthenticated={handleAuth} />}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Novo Agendamento</h1>
          <p className="text-gray-500">Cadastre o agendamento de transporte para o dia seguinte</p>
        </div>
        {authToken && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Informações Gerais</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Empresa
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                UF <span className="text-red-500">*</span>
              </label>
              <select
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                className="w-full px-4 py-2 border-2 border-primary-300 bg-primary-50 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                {UFS.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
               <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-primary-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data do Agendamento
              </label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
          </div>
        </div>
        
        {/* Categories */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Categorias</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <div key={category.name} className="border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {category.name}
                </label>
                <input
                  type="number"
                  min="0"
                  value={category.count || ''}
                  onChange={(e) => handleCategoryChange(index, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0"
                />
                
                {/* Lost plates input */}
                {category.name === 'Indisponíveis' && category.count > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">
                      Informe as placas ({category.count} veículo(s)) e motivo
                    </p>
                    {category.plates.map((plateObj, plateIndex) => (
                      <div key={plateIndex} className="flex flex-col gap-2 mb-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={plateObj.plate}
                            onChange={(e) => handlePlateChange(index, plateIndex, e.target.value)}
                            className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="ABC-1234"
                            maxLength={8}
                          />
                          <button
                            type="button"
                            onClick={() => removePlate(index, plateIndex)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={plateObj.reason}
                          onChange={(e) => handlePlateReasonChange(index, plateIndex, e.target.value)}
                          className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Motivo"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addPlate(index)}
                      className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar placa
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Capacities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Capacidade de Carga</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {capacities.map((capacity, index) => (
              <div key={capacity.name} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Perfil {capacity.name}
                  </label>
                  <span className="text-xs text-gray-500">{capacity.weight} kg/veículo</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={capacity.count || ''}
                  onChange={(e) => handleCapacityChange(index, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0"
                />
                <div className="mt-2 text-sm text-gray-600">
                  Total: {(capacity.count * capacity.weight).toLocaleString('pt-BR')} kg
                </div>
              </div>
            ))}
          </div>
          
          {/* Total */}
          <div className="mt-6 p-4 bg-primary-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-primary-700">Total de Veículos</p>
                <p className="text-2xl font-bold text-primary-800">{calculateTotalVehicles()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-700">Capacidade Total</p>
                <p className="text-2xl font-bold text-primary-800">
                  {calculateTotalCapacity().toLocaleString('pt-BR')} kg
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Capacities - SPOT */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Capacidade de Carga - SPOT</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {capacitiesSpot.map((capacity, index) => (
              <div key={capacity.name} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Perfil {capacity.name}
                  </label>
                  <span className="text-xs text-gray-500">{capacity.weight} kg/veículo</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={capacity.count || ''}
                  onChange={(e) => handleCapacitySpotChange(index, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0"
                />
                <div className="mt-2 text-sm text-gray-600">
                  Total: {(capacity.count * capacity.weight).toLocaleString('pt-BR')} kg
                </div>
              </div>
            ))}
          </div>
          
          {/* Total - SPOT */}
          <div className="mt-6 p-4 bg-primary-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-primary-700">Total de Veículos</p>
                <p className="text-2xl font-bold text-primary-800">{calculateTotalVehiclesSpot()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-700">Capacidade Total</p>
                <p className="text-2xl font-bold text-primary-800">
                  {calculateTotalCapacitySpot().toLocaleString('pt-BR')} kg
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => {
              setCategories(CATEGORIES.map((cat) => ({ name: cat, count: 0, plates: [] })))
              setCapacities(PROFILES.map((p) => ({ name: p.name, weight: p.weight, count: 0 })))
              setCapacitiesSpot(PROFILES.map((p) => ({ name: p.name, weight: p.weight, count: 0 })))
              setError(null)
              setSuccess(null)
            }}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Limpar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Salvando...' : 'Salvar Agendamento'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewSchedule
