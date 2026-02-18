# Estágio 1: Build do Frontend
FROM node:20-alpine as build-frontend
WORKDIR /app-frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Estágio 2: Backend Python
FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY backend/requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

COPY backend/ .

# Copia os arquivos estáticos do build do frontend para o backend
COPY --from=build-frontend /backend/static /app/static

EXPOSE 8000
