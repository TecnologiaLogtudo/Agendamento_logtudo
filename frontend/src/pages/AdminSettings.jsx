import { useState, useEffect } from 'react'
import axios from 'axios'
import { Trash2, Plus } from 'lucide-react'
import AuthModal from '../components/AuthModal'

function AdminSettings() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('admin_token'))

  // keep axios header up to date
  useEffect(() => {
    if (authToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [authToken])
  const [companies, setCompanies] = useState([])
  const [ufs, setUfs] = useState([])
  const [categories, setCategories] = useState([])
  const [profiles, setProfiles] = useState([])

  const [newCompany, setNewCompany] = useState({ name: '', vehicle_goal: 0 })
  const [newUfName, setNewUfName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newProfile, setNewProfile] = useState({ name: '', weight: 0, spot: false, company_ids: [] })
  const [editingCompany, setEditingCompany] = useState(null)
  const [editingProfile, setEditingProfile] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleAuth = (token) => {
    localStorage.setItem('admin_token', token)
    setAuthToken(token)
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setAuthToken(null)
  }

  useEffect(() => {
    if (authToken) {
      fetchAll()
    }
  }, [authToken])

  const fetchAll = async () => {
    setError(null)
    try {
      const [compRes, ufsRes, catRes, profRes] = await Promise.all([
        axios.get('/api/companies'),
        axios.get('/api/admin/ufs'),
        axios.get('/api/admin/categories'),
        axios.get('/api/admin/profiles')
      ])
      setCompanies(compRes.data)
      setUfs(ufsRes.data)
      setCategories(catRes.data)
      setProfiles(profRes.data)
    } catch (err) {
      console.error('Erro ao carregar dados de administração', err)
      setError('Falha ao carregar dados. Veja console.')
    }
  }

  const handleAddCompany = async () => {
    try {
      await axios.post('/api/companies', newCompany)
      setNewCompany({ name: '', vehicle_goal: 0 })
      fetchAll()
      setSuccess('Empresa adicionada')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao adicionar empresa')
    }
  }

  const handleUpdateCompany = async () => {
    if (!editingCompany) return;
    try {
        await axios.put(`/api/companies/${editingCompany.id}`, { 
            name: editingCompany.name, 
            vehicle_goal: editingCompany.vehicle_goal 
        });
        setEditingCompany(null);
        fetchAll();
        setSuccess('Empresa atualizada');
    } catch (err) {
        setError(err.response?.data?.detail || 'Erro ao atualizar empresa');
    }
  }

  const handleAddUf = async () => {
    try {
      await axios.post('/api/admin/ufs', { name: newUfName })
      setNewUfName('')
      fetchAll()
      setSuccess('UF adicionada')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao adicionar UF')
    }
  }

  const handleAddCategory = async () => {
    try {
      await axios.post('/api/admin/categories', { name: newCategoryName })
      setNewCategoryName('')
      fetchAll()
      setSuccess('Categoria adicionada')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao adicionar categoria')
    }
  }

  const handleAddProfile = async () => {
    try {
      await axios.post('/api/admin/profiles', newProfile)
      setNewProfile({ name: '', weight: 0, spot: false, company_ids: [] })
      fetchAll()
      setSuccess('Perfil adicionado')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao adicionar perfil')
    }
  }

  const handleUpdateProfile = async () => {
    if (!editingProfile) return;
    try {
      const { id, ...profileData } = editingProfile;
      await axios.put(`/api/admin/profiles/${id}`, profileData);
      setEditingProfile(null);
      fetchAll();
      setSuccess('Perfil atualizado');
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao atualizar perfil');
    }
  }

  const handleDelete = async (path) => {
    try {
      await axios.delete(path)
      fetchAll()
      setSuccess('Registro excluído com sucesso')
    } catch (err) {
      console.error('delete erro', err)
      const errorMsg = err.response?.data?.detail || 'Erro ao excluir registro'
      setError(errorMsg)
      // Log full response for debugging
      if (err.response?.status === 400) {
        console.warn('Erro 400 - Motivo específico:', errorMsg)
      }
    }
  }

  if (!authToken) {
    return <AuthModal onAuthenticated={handleAuth} />
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Administração</h1>
        <button
          onClick={handleLogout}
          className="text-red-600 hover:underline"
        >Sair</button>
      </div>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {success && <div className="mb-4 text-green-600">{success}</div>}

      <section className="mb-8">
        <h2 className="text-xl font-semibold">Empresas</h2>
        <div className="flex gap-2 mb-2">
          <input
            className="border px-2 py-1 flex-1"
            value={newCompany.name}
            onChange={e => setNewCompany({...newCompany, name: e.target.value})}
            placeholder="Nome da empresa"
          />
          <input
            className="border px-2 py-1 w-40"
            value={newCompany.vehicle_goal}
            onChange={e => setNewCompany({...newCompany, vehicle_goal: parseInt(e.target.value) || 0})}
            placeholder="Meta de veículos/dia"
            type="number"
          />
          <button onClick={handleAddCompany} className="px-3 py-1 bg-primary-600 text-white rounded">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <ul>
          {companies.map(c => (
            <li key={c.id} className="flex justify-between items-center p-2 hover:bg-gray-50">
              { editingCompany?.id === c.id ? (
                  <>
                      <input 
                          value={editingCompany.name} 
                          onChange={e => setEditingCompany({...editingCompany, name: e.target.value})}
                          className="border px-2 py-1"
                      />
                      <input 
                          value={editingCompany.vehicle_goal} 
                          onChange={e => setEditingCompany({...editingCompany, vehicle_goal: parseInt(e.target.value) || 0})}
                          className="border px-2 py-1 w-24"
                          type="number"
                      />
                      <div>
                          <button onClick={handleUpdateCompany} className="text-green-600 p-1">Salvar</button>
                          <button onClick={() => setEditingCompany(null)} className="text-gray-600 p-1">Cancelar</button>
                      </div>
                  </>
              ) : (
                  <>
                      <span>{c.name} - <span className="text-sm text-gray-600">Meta: {c.vehicle_goal} carros/dia</span></span>
                      <div className="flex gap-2">
                          <button onClick={() => setEditingCompany({...c})} className="text-blue-600">Editar</button>
                          <button onClick={() => handleDelete(`/api/companies/${c.id}`)} className="text-red-500">
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold">UFs</h2>
        <div className="flex gap-2 mb-2">
          <input
            className="border px-2 py-1 flex-1"
            value={newUfName}
            onChange={e => setNewUfName(e.target.value)}
            placeholder="Nome da UF"
          />
          <button onClick={handleAddUf} className="px-3 py-1 bg-primary-600 text-white rounded">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <ul>
          {ufs.map(u => (
            <li key={u.id} className="flex justify-between">
              {u.name}
              <button onClick={() => handleDelete(`/api/admin/ufs/${u.id}`)} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold">Categorias</h2>
        <div className="flex gap-2 mb-2">
          <input
            className="border px-2 py-1 flex-1"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            placeholder="Nome da categoria"
          />
          <button onClick={handleAddCategory} className="px-3 py-1 bg-primary-600 text-white rounded">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <ul>
          {categories.map(cat => (
            <li key={cat.id} className="flex justify-between">
              {cat.name}
              <button onClick={() => handleDelete(`/api/admin/categories/${cat.id}`)} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Perfis de Capacidade</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Perfil</label>
            <input
              className="border px-2 py-1 w-full rounded"
              placeholder="Ex: Truck"
              value={newProfile.name}
              onChange={e => setNewProfile({ ...newProfile, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
            <input
              className="border px-2 py-1 w-full rounded"
              placeholder="Ex: 14000"
              type="number"
              value={newProfile.weight}
              onChange={e => setNewProfile({ ...newProfile, weight: parseInt(e.target.value) || 0 })}
            />
            <p className="text-xs text-gray-500 mt-1">Capacidade de carga do veículo em quilos.</p>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="spot-checkbox"
                checked={newProfile.spot}
                onChange={e => setNewProfile({ ...newProfile, spot: e.target.checked })}
              />
              <label htmlFor="spot-checkbox" className="text-sm font-medium text-gray-700">Perfil de Spot/Parado</label>
            </div>
            <p className="text-xs text-gray-500 mt-1">Se marcado, este perfil será usado para veículos que não estão em rota.</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Disponibilidade da Empresa</label>
            <p className="text-xs text-gray-500 mb-2">Selecione para quais empresas este perfil se aplica. Se nenhuma for marcada, será válido para todas.</p>
            <div className="flex gap-4 flex-wrap">
              {companies.map(c => (
                <label key={c.id} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={newProfile.company_ids.includes(c.id)}
                    onChange={e => {
                      const ids = newProfile.company_ids.slice()
                      if (e.target.checked) ids.push(c.id)
                      else {
                        const idx = ids.indexOf(c.id)
                        if (idx !== -1) ids.splice(idx, 1)
                      }
                      setNewProfile({ ...newProfile, company_ids: ids })
                    }}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
          <button
            className="px-4 py-2 bg-primary-600 text-white rounded col-span-full"
            onClick={handleAddProfile}
          >
            <Plus className="w-4 h-4 inline" /> Adicionar Perfil
          </button>
        </div>
        <ul>
          {profiles.map(p => {
            // determine which companies this profile applies to
            const names = p.company_ids && p.company_ids.length > 0
              ? companies.filter(c => p.company_ids.includes(c.id)).map(c => c.name)
              : companies.map(c => c.name)
            const displayNames = names.length > 0 ? names.join(', ') : 'nenhuma'

            return (
              <li key={p.id} className="flex justify-between p-2 hover:bg-gray-50">
                {editingProfile?.id === p.id ? (
                  <div className="w-full">
                    <div className="flex gap-2 mb-2">
                      <input
                        value={editingProfile.name}
                        onChange={e => setEditingProfile({...editingProfile, name: e.target.value})}
                        className="border px-2 py-1 flex-1"
                        placeholder="Nome do perfil"
                      />
                      <input
                        type="number"
                        value={editingProfile.weight}
                        onChange={e => setEditingProfile({...editingProfile, weight: parseInt(e.target.value) || 0})}
                        className="border px-2 py-1 w-24"
                        placeholder="Peso (kg)"
                      />
                    </div>
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingProfile.spot}
                        onChange={e => setEditingProfile({...editingProfile, spot: e.target.checked})}
                      />
                      <label className="text-sm">Spot/Parado</label>
                    </div>
                    <div className="mb-2 flex gap-4 flex-wrap">
                      {companies.map(c => (
                        <label key={c.id} className="flex items-center gap-1 text-sm">
                          <input
                            type="checkbox"
                            checked={editingProfile.company_ids.includes(c.id)}
                            onChange={e => {
                              const ids = editingProfile.company_ids.slice()
                              if (e.target.checked) {
                                if (!ids.includes(c.id)) ids.push(c.id)
                              } else {
                                const idx = ids.indexOf(c.id)
                                if (idx !== -1) ids.splice(idx, 1)
                              }
                              setEditingProfile({ ...editingProfile, company_ids: ids })
                            }}
                          />
                          {c.name}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleUpdateProfile} className="text-green-600 px-2 py-1">Salvar</button>
                      <button onClick={() => setEditingProfile(null)} className="text-gray-600 px-2 py-1">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span>
                      {p.name} ({p.weight}kg) {p.spot && '[SPOT]'} - empresas: {displayNames}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingProfile({...p})} className="text-blue-600">Editar</button>
                      <button onClick={() => handleDelete(`/api/admin/profiles/${p.id}`)} className="text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

export default AdminSettings
