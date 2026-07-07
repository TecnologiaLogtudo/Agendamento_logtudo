import { useState } from 'react'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'New Appointment', icon: 'calendar_add_on' },
  { label: 'History', icon: 'history' },
  { label: 'Admin', icon: 'settings' },
]

const metricCards = [
  {
    label: 'Total Disponibilidade',
    value: '3.190',
    icon: 'inventory',
    accentClass: 'text-[#00288e]',
    badgeText: '12%',
    badgeColor: '#16a34a',
  },
  {
    label: 'Dias Abaixo Meta',
    value: '17',
    icon: 'warning',
    accentClass: 'text-[#ba1a1a]',
    betaText: 'Últimos 30 dias',
  },
  {
    label: 'Viagens Perdidas',
    value: '286',
    icon: 'cancel',
    accentClass: 'text-[#802a00]',
    badgeText: '4%',
    badgeColor: '#ba1a1a',
  },
  {
    label: 'Agendamentos',
    value: '5',
    icon: 'event_available',
    accentClass: 'text-[#0058be]',
    betaText: 'Hoje',
  },
]

const companyBars = [
  { company: 'Lactalis', value: '1,240', width: '85%', color: '#00288e' },
  { company: 'DPA', value: '980', width: '65%', color: '#0058be' },
  { company: '3 Corações', value: '650', width: '45%', color: '#1e40af' },
  { company: 'Danone', value: '320', width: '25%', color: '#2170e4' },
]

const statusCards = [
  { label: 'Em rota', value: '45%', bg: '#00288e', text: '#ffffff' },
  { label: 'Em viagem', value: '25%', bg: '#0058be', text: '#ffffff' },
  { label: 'Diária', value: '20%', bg: '#d3e4fe', text: '#0b1c30', small: true },
  { label: 'Perdidas', value: '10%', bg: '#ffdad6', text: '#93000a', small: true },
  { label: 'Spot Disponib.', value: '5%', bg: '#2170e4', text: '#ffffff', small: true },
  { label: 'Spot/Parado', value: '3%', bg: '#d3e4fe', text: '#0b1c30', small: true },
  { label: 'Indispon.', value: '2%', bg: '#872d00', text: '#ffffff', small: true },
  { label: 'Reentreg.', value: '1%', bg: '#1e40af', text: '#ffffff', small: true },
]

const topStates = [
  { code: 'SP', label: 'São Paulo', value: '1.240', color: '#00288e' },
  { code: 'RJ', label: 'Rio de Janeiro', value: '850', color: '#00288e', opacity: 0.8 },
  { code: 'MG', label: 'Minas Gerais', value: '620', color: '#00288e', opacity: 0.6 },
  { code: 'BA', label: 'Bahia', value: '480', color: '#00288e', opacity: 0.4 },
]

const timelineBars = [
  '40%',
  '55%',
  '70%',
  '60%',
  '85%',
  '50%',
  '45%',
  '92%',
  '30%',
  '65%',
  '75%',
  '80%',
  '50%',
  '40%',
  '55%',
  '70%',
  '60%',
  '85%',
  '50%',
  '45%',
  '92%',
]

const recentSchedules = [
  {
    date: '30/01/2024',
    company: 'Lactalis do Brasil',
    uf: 'SP',
    vehicles: '142',
    availability: '120',
    status: 'Em Rota (82)',
    badgeClass: 'bg-green-100 text-green-800',
  },
  {
    date: '30/01/2024',
    company: 'DPA Nestlé',
    uf: 'RJ',
    vehicles: '85',
    availability: '60',
    status: 'Aguardando (15)',
    badgeClass: 'bg-blue-100 text-blue-800',
  },
  {
    date: '29/01/2024',
    company: '3 Corações',
    uf: 'MG',
    vehicles: '56',
    availability: '56',
    status: 'Concluído (56)',
    badgeClass: 'bg-[#ffdbce] text-[#802a00]',
  },
  {
    date: '29/01/2024',
    company: 'Danone',
    uf: 'SP',
    vehicles: '40',
    availability: '12',
    status: 'Perdidas (28)',
    badgeClass: 'bg-[#ffdad6] text-[#93000a]',
  },
]

function Dashboard() {
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [companyFilter, setCompanyFilter] = useState('Todas')
  const [transportFilter, setTransportFilter] = useState('Todos')
  const [ufFilter, setUfFilter] = useState('Todas')

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30]" style={{ fontFamily: 'Hanken Grotesk, sans-serif' }}>
      <aside className="fixed left-0 top-0 h-screen w-64 bg-[#f8f9ff] border-r border-[#c4c5d5] z-50 flex flex-col py-6 px-4">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-[#00288e] flex items-center justify-center rounded-xl">
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_shipping
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#00288e]">LogSchedule</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#444653]/60">by Logtudo</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {NAV_ITEMS.map((item) => {
            const selected = activeNav === item.label
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveNav(item.label)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  selected
                    ? 'bg-[#1e40af] text-white font-bold'
                    : 'text-[#444653] hover:bg-[#eff4ff]'
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto p-4 bg-[#eff4ff] rounded-xl">
          <p className="text-[11px] font-bold text-[#444653] mb-3">System Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[11px] font-bold text-[#0b1c30]">Operational</span>
          </div>
        </div>
      </aside>

      <header className="fixed top-0 right-0 h-20 bg-[#f8f9ff]/80 backdrop-blur-md border-b border-[#c4c5d5] z-40 flex justify-between items-center px-8"
        style={{ width: 'calc(100% - 16rem)' }}
      >
        <div className="flex items-center gap-4 flex-1 max-w-4xl">
          <div className="flex items-center gap-2 bg-[#e5eeff] rounded-full px-4 py-2 border border-[#c4c5d5]">
            <span className="material-symbols-outlined text-[#444653] text-sm">filter_alt</span>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-transparent border-none text-[14px] focus:ring-0 text-[#0b1c30] cursor-pointer"
            >
              <option>Empresa: Todas</option>
              <option>Lactalis</option>
              <option>Danone</option>
            </select>
            <div className="w-[1px] h-4 bg-[#c4c5d5]"></div>
            <select
              value={transportFilter}
              onChange={(e) => setTransportFilter(e.target.value)}
              className="bg-transparent border-none text-[14px] focus:ring-0 text-[#0b1c30] cursor-pointer"
            >
              <option>Transporte: Todos</option>
              <option>Frigorífico</option>
              <option>Carga Seca</option>
            </select>
            <div className="w-[1px] h-4 bg-[#c4c5d5]"></div>
            <select
              value={ufFilter}
              onChange={(e) => setUfFilter(e.target.value)}
              className="bg-transparent border-none text-[14px] focus:ring-0 text-[#0b1c30] cursor-pointer"
            >
              <option>UF: Todas</option>
              <option>SP</option>
              <option>RJ</option>
              <option>MG</option>
            </select>
            <div className="w-[1px] h-4 bg-[#c4c5d5]"></div>
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-70">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              <span className="text-[14px] font-semibold text-[#0b1c30]">01 Jan - 30 Jan</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-[#444653]">
            <span className="material-symbols-outlined cursor-pointer hover:text-[#00288e] transition-colors">notifications</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-[#00288e] transition-colors">help</span>
          </div>
          <div className="h-8 w-[1px] bg-[#c4c5d5]"></div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden xl:block">
              <p className="text-[14px] font-bold text-[#0b1c30]">Gestor Logístico</p>
              <p className="text-[10px] text-[#444653]">Admin Nível 4</p>
            </div>
            <img
              alt="Professional Logistics Manager"
              className="w-10 h-10 rounded-full border-2 border-[#1e40af]"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuALPLzaziWuTKPHwqzlIiDUc0Md8sxQHavbzhBeTeoDUb3W7XYCn-WBnBCxcer9KH2I5ItPN1v3bFZuu3wF_cQMUaeG-IeSXED15DbuC9R50KKbIvMzfqJmuSgAtsZGQxX3jWJChxKvPpooAf_9Y0QME7c1rxWXnFoeDzLH9tAX9h5m1KJmd3Ksz_atqVxT2hRCwVZaaJkXDyoeAjoswxLuZPn_2Sm_w76padAO4p-DW3s5JvC5Xk18FBKO1xGd3zD_2FVJA0oJpA"
            />
          </div>
        </div>
      </header>

      <main className="ml-64 pt-28 px-8 pb-12">
        <div className="mb-8">
          <h2 className="text-[32px] font-bold text-[#0b1c30]">Dashboard</h2>
          <p className="text-[16px] text-[#444653] mt-1">Visão geral dos agendamentos e métricas operacionais</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className="bg-[#f8f9ff] p-6 rounded-xl border border-[#c4c5d5] tonal-elevation flex flex-col justify-between h-32"
            >
              <div className="flex justify-between items-start">
                <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#444653]">{card.label}</span>
                <span className={`${card.accentClass} material-symbols-outlined`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  {card.icon}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-[32px] font-bold ${card.accentClass}`}>{card.value}</span>
                {card.badgeText && (
                  <span className="text-[12px] font-bold flex items-center" style={{ color: card.badgeColor }}>
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    {card.badgeText}
                  </span>
                )}
                {!card.badgeText && card.betaText && (
                  <span className="text-[12px] font-bold text-[#444653]">{card.betaText}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6 mb-8">
          <div className="col-span-12 lg:col-span-7 bg-[#f8f9ff] p-6 rounded-xl border border-[#c4c5d5] tonal-elevation">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[20px] font-semibold text-[#0b1c30]">Disponibilidade por Empresa</h3>
              <button className="text-[#00288e] font-semibold flex items-center gap-1 hover:underline">
                VER DETALHES
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="space-y-4 pt-2">
              {companyBars.map((bar) => (
                <div key={bar.company} className="space-y-1">
                  <div className="flex justify-between text-[14px] font-bold text-[#0b1c30]">
                    <span>{bar.company}</span>
                    <span>{bar.value}</span>
                  </div>
                  <div className="w-full bg-[#e5eeff] h-3 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: bar.width, backgroundColor: bar.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5 bg-[#f8f9ff] p-6 rounded-xl border border-[#c4c5d5] tonal-elevation">
            <h3 className="text-[20px] font-semibold text-[#0b1c30] mb-6">Distribuição por Status</h3>
            <div className="grid grid-cols-4 grid-rows-3 gap-1 w-full h-48">
              {statusCards.map((status) => (
                <div
                  key={status.label}
                  className="p-2 flex flex-col justify-end rounded-lg"
                  style={{ backgroundColor: status.bg, color: status.text }}
                >
                  <span className={`text-[8px] font-bold uppercase opacity-80 ${status.small ? 'leading-tight' : ''}`}>
                    {status.label}
                  </span>
                  <span className={`font-bold ${status.small ? 'text-xs' : ''}`}>{status.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#f8f9ff] p-6 rounded-xl border border-[#c4c5d5] tonal-elevation mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h3 className="text-[20px] font-semibold text-[#0b1c30]">Performance por Região</h3>
              <p className="text-[14px] text-[#444653]">Volume de veículos operacionais por estado</p>
            </div>
            <div className="flex items-center gap-4 bg-[#ffffff] p-3 rounded-lg border border-[#c4c5d5]">
              <div className="text-[12px] font-bold text-[#444653] mr-2">LEGENDA:</div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#d3e4fe]"></div>
                <span className="text-[11px] font-bold">Baixo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#0058be]"></div>
                <span className="text-[11px] font-bold">Médio</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#00288e]"></div>
                <span className="text-[11px] font-bold">Alto</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-8 items-center">
            <div className="col-span-12 lg:col-span-7 flex justify-center">
              <svg className="w-full max-w-md h-auto" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
                <path className="map-region" fill="#d3e4fe" d="M30,100 L180,50 L250,150 L180,220 L50,180 Z" />
                <path className="map-region" fill="#0058be" d="M260,140 L380,100 L450,220 L350,280 L280,220 Z" />
                <path className="map-region" fill="#d3e4fe" d="M190,230 L270,230 L300,320 L230,350 L160,300 Z" />
                <path className="map-region" fill="#00288e" d="M280,310 L340,290 L400,350 L350,420 L280,380 Z" />
                <path className="map-region" fill="#0058be" d="M240,360 L290,390 L280,470 L210,460 Z" />
                <text fill="white" fontSize="12" fontWeight="bold" pointerEvents="none" x="100" y="140">NORTE</text>
                <text fill="white" fontSize="12" fontWeight="bold" pointerEvents="none" x="340" y="180">NORDESTE</text>
                <text fill="white" fontSize="12" fontWeight="bold" pointerEvents="none" x="200" y="290">C.OESTE</text>
                <text fill="white" fontSize="12" fontWeight="bold" pointerEvents="none" x="320" y="360">SUDESTE</text>
                <text fill="white" fontSize="12" fontWeight="bold" pointerEvents="none" x="240" y="430">SUL</text>
              </svg>
            </div>
            <div className="col-span-12 lg:col-span-5 space-y-4">
              <div className="p-4 bg-[#d3e4fe]/30 rounded-xl border border-[#c4c5d5]">
                <h4 className="text-[14px] font-bold text-[#00288e] mb-3">TOP ESTADOS (VEÍCULOS)</h4>
                <div className="space-y-3">
                  {topStates.map((state) => (
                    <div key={state.code} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs"
                          style={{ backgroundColor: state.color, opacity: state.opacity ?? 1 }}
                        >
                          {state.code}
                        </div>
                        <span className="font-bold text-[#0b1c30]">{state.label}</span>
                      </div>
                      <span className="font-mono font-bold text-[#00288e]">{state.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#dde2ff]/30 rounded-lg">
                <span className="material-symbols-outlined text-[#0058be]">info</span>
                <p className="text-[11px] font-medium leading-tight text-[#0b1c30]">
                  A região Sudeste concentra 58% do volume total de carregamentos deste mês.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#f8f9ff] p-6 rounded-xl border border-[#c4c5d5] tonal-elevation mb-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-[20px] font-semibold text-[#0b1c30]">Evolução Diária: Realizado vs. Meta (Veículos)</h3>
              <p className="text-[14px] text-[#444653]">Performance de carregamento nos últimos 30 dias</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-[#00288e] rounded" />
                <span className="text-[14px]">Realizado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#ba1a1a] border-dashed rounded-full" />
                <span className="text-[14px]">Meta</span>
              </div>
            </div>
          </div>
          <div className="h-48 w-full flex items-end gap-1 overflow-x-auto pb-4 hide-scrollbar">
            {timelineBars.map((height, index) => (
              <div
                key={`${height}-${index}`}
                className={`flex-1 min-w-[12px] rounded-t-sm transition-colors ${index % 3 === 0 ? 'bg-[#00288e]' : 'bg-[#e5eeff] hover:bg-[#00288e]'}`}
                style={{ height }}
              >
                {index % 3 === 0 && (
                  <div className="absolute inset-x-0 -top-1 border-t-2 border-[#ba1a1a] border-dashed" />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-[#444653] font-bold">
            <span>01 JAN</span>
            <span>08 JAN</span>
            <span>15 JAN</span>
            <span>22 JAN</span>
            <span>30 JAN</span>
          </div>
        </div>

        <div className="bg-[#f8f9ff] rounded-xl border border-[#c4c5d5] tonal-elevation overflow-hidden">
          <div className="p-6 flex justify-between items-center border-b border-[#c4c5d5]">
            <h3 className="text-[20px] font-semibold text-[#0b1c30]">Agendamentos Recentes</h3>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-[#e5eeff] rounded-lg text-[14px] font-bold hover:bg-[#d3e4fe] transition-colors">
                Exportar CSV
              </button>
              <button className="px-4 py-2 bg-[#00288e] text-white rounded-lg text-[14px] font-bold hover:shadow-lg transition-all">
                Ver Todos
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left zebra-table">
              <thead>
                <tr className="bg-[#eff4ff] text-[#444653] text-[11px] font-bold uppercase tracking-[0.16em] border-b border-[#c4c5d5]">
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">UF</th>
                  <th className="px-6 py-4">Veículos</th>
                  <th className="px-6 py-4">Disponibilidade</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-[14px] divide-y divide-[#c4c5d5]/30">
                {recentSchedules.map((row) => (
                  <tr key={`${row.company}-${row.date}`}>
                    <td className="px-6 py-4 font-bold">{row.date}</td>
                    <td className="px-6 py-4">{row.company}</td>
                    <td className="px-6 py-4">{row.uf}</td>
                    <td className="px-6 py-4 font-mono text-[#00288e]">{row.vehicles}</td>
                    <td className="px-6 py-4 font-mono text-[#00288e]">{row.availability}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${row.badgeClass}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[#00288e] hover:bg-[#00288e]/10 p-2 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#00288e] text-white rounded-[1.5rem] shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-50 group">
        <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">add</span>
      </button>
    </div>
  )
}

export default Dashboard
