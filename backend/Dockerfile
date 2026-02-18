# Estágio 1: Build do Frontend
FROM node:20-alpine as build-frontend
WORKDIR /app-frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .

# Define a URL da API como relativa para produção (/api)
# Isso garante que o frontend faça requisições para o domínio atual
ENV VITE_API_URL=/api

RUN npm run build

# Estágio 2: Backend Python
FROM python:3.11-slim

WORKDIR /app

# Instala dependências de sistema necessárias para compilar pacotes Python (se necessário)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

COPY backend/requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

COPY backend/ .

# Copia os arquivos estáticos do build do frontend para o backend
COPY --from=build-frontend /app-frontend/dist /app/static

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
