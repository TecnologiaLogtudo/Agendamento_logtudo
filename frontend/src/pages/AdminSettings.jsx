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

  const [newCompanyName, setNewCompanyName] = useState('')
  const [newUfName, setNewUfName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newProfile, setNewProfile] = useState({ name: '', weight: 0, spot: false, company_ids: [] })
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
    fetchAll()
  }, [])

  const fetchAll = async () => {
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
      await axios.post('/api/companies', { name: newCompanyName })
      setNewCompanyName('')
      fetchAll()
      setSuccess('Empresa adicionada')
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao adicionar empresa')
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

  const handleDelete = async (path) => {
    try {
      await axios.delete(path)
      fetchAll()
    } catch (err) {
      console.error('delete erro', err)
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
            value={newCompanyName}
            onChange={e => setNewCompanyName(e.target.value)}
            placeholder="Nome da empresa"
          />
          <button onClick={handleAddCompany} className="px-3 py-1 bg-primary-600 text-white rounded">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <ul>
          {companies.map(c => (
            <li key={c.id} className="flex justify-between">
              {c.name}
              <button onClick={() => handleDelete(`/api/companies/${c.id}`)} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
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

      <section className="mb-8">
        <h2 className="text-xl font-semibold">Perfis de Capacidade</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            className="border px-2 py-1"
            placeholder="Nome"
            value={newProfile.name}
            onChange={e => setNewProfile({ ...newProfile, name: e.target.value })}
          />
          <input
            className="border px-2 py-1"
            placeholder="Peso"
            type="number"
            value={newProfile.weight}
            onChange={e => setNewProfile({ ...newProfile, weight: parseInt(e.target.value) || 0 })}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newProfile.spot}
              onChange={e => setNewProfile({ ...newProfile, spot: e.target.checked })}
            />
            <span>Spot/Parado</span>
          </div>
          <div className="col-span-full">
            <p className="text-sm mb-1">Empresas</p>
            <div className="flex gap-2 flex-wrap">
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
            <Plus className="w-4 h-4 inline" /> Adicionar
          </button>
        </div>
        <ul>
          {profiles.map(p => (
            <li key={p.id} className="flex justify-between">
              <span>
                {p.name} ({p.weight}kg) {p.spot && '[SPOT]'} - empresas: {p.company_ids.join(', ')}
              </span>
              <button onClick={() => handleDelete(`/api/admin/profiles/${p.id}`)} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default AdminSettings
