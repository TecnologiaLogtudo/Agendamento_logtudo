# LogiSched - Sistema de Agendamento Logístico

Sistema completo de agendamento de transporte logístico com React (Vite), FastAPI, PostgreSQL e Docker.

## 🚀 Quick Start (Com Docker)

```bash
# Clone o projeto
cd logisched

# Inicie os serviços
docker compose up -d --build

# Acesse a aplicação
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## 🚀 Quick Start (Sem Docker)

### Backend

```bash
cd backend

# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar banco de dados
# Crie um banco PostgreSQL chamado 'logisched'

# Executar servidor
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Executar servidor de desenvolvimento
npm run dev
```

## 📋 Funcionalidades

### 1. Dashboard
- **Métricas principais**: Total de capacidade (kg), veículos, viagens perdidas
- **Gráfico de barras**: Capacidade por empresa
- **Gráfico de pizza**: Distribuição por categoria
- **Lista de agendamentos recentes**

### 2. Novo Agendamento
- **Seleção de empresa**: 3 Corações, Itambé, DPA
- **Data do agendamento**: Padrão para o dia seguinte
- **Categorias**:
  - Carros em rota
  - Reentrega
  - Em viagem
  - Perdidas (com registro de placas)
  - Diária
  - Stop/Parado
- **Perfis de veículos**:
  - HR: 1.500 kg
  - 3/4: 3.500 kg
  - Toco: 7.000 kg
  - Truck: 14.000 kg
- **Cálculo automático de capacidade total**

### 3. Histórico
- **Listagem de agendamentos** com filtros
- **Exportação para Excel** (.xlsx)
- **Resumo de totais**

## 📁 Estrutura do Projeto

```
logisched/
├── docker-compose.yml      # Orquestração Docker
├── backend/
│   ├── Dockerfile
│   ├── main.py            # API FastAPI
│   └── requirements.txt
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── NewSchedule.jsx
        │   └── ScheduleList.jsx
```

## 🔧 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/companies` | Listar empresas |
| GET | `/api/categories` | Listar categorias |
| GET | `/api/profiles` | Listar perfis de veículos |
| POST | `/api/schedules` | Criar agendamento |
| GET | `/api/schedules` | Listar agendamentos |
| GET | `/api/dashboard/metrics` | Métricas do dashboard |
| GET | `/api/schedules/export` | Exportar para Excel |

## 🐳 Variáveis de Ambiente

### Backend
```
DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/logisched
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_USER=user
POSTGRES_PASSWORD=pass
POSTGRES_DB=logisched
```

### Frontend
```
VITE_API_URL=http://localhost:8000
```

## 📦 Perfis de Carga

| Perfil | Capacidade |
|--------|-----------|
| HR | 1.500 kg |
| 3/4 | 3.500 kg |
| Toco | 7.000 kg |
| Truck | 14.000 kg |

## 🛠️ Tecnologias

- **Frontend**: React 18, Vite, TailwindCSS, Recharts, Axios
- **Backend**: Python 3.11, FastAPI, SQLAlchemy, Pydantic
- **Database**: PostgreSQL 15
- **Infraestrutura**: Docker Compose

## 📄 Licença

MIT License
