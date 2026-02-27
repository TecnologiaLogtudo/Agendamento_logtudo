import { useState, useEffect } from 'react'
import axios from 'axios'
import { FileDown, Filter, X } from 'lucide-react'

function ScheduleList() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  
  // Filters
  const [companyFilter, setCompanyFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  useEffect(() => {
    fetchSchedules()
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
  
  const handleExport = async () => {
    try {
      let url = '/api/schedules/export'
      const params = []
      
      if (companyFilter) params.push(`company_id=${companyFilter}`)
      if (startDate) params.push(`start_date=${startDate}`)
      if (endDate) params.push(`end_date=${endDate}`)
      
      if (params.length > 0) url += '?' + params.join('&')
      
      const response = await axios.get(url, {
        responseType: 'blob',
      })
      
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const link = document.createElement('a')
      link.href = window.URL.createObjectURL(blob)
      
      const date = new Date()
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      link.download = `agendamentos_${dateStr}.xlsx`
      
      link.click()
    } catch (err) {
      console.error('Erro ao exportar:', err)
    }
  }
  
  const getCompanyName = (id) => {
    switch (id) {
      case 1: return '3 Corações'
      case 2: return 'Itambé'
      case 3: return 'DPA'
      default: return 'Desconhecido'
    }
  }
  
  const formatKg = (kg) => kg.toLocaleString('pt-BR')
  
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
                <option value="1">3 Corações</option>
                <option value="2">Itambé</option>
                <option value="3">DPA</option>
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
                    Veículos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Capacidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categorias
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Perfis
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
            <p className="text-sm text-gray-500">Total de Capacidade</p>
            <p className="text-xl font-bold text-gray-800">
              {formatKg(schedules.reduce((sum, s) => sum + s.total_capacity_kg, 0))} kg
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleList
