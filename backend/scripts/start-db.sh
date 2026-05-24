#!/usr/bin/env bash
# Levanta PostgreSQL con Docker (WSL o Windows)
set -e

cd "$(dirname "$0")/.."

docker_cmd() {
  # En WSL suele existir solo docker.exe de Windows
  if [ -x "/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe" ]; then
    "/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe" "$@"
    return
  fi
  if command -v docker.exe &>/dev/null; then
    docker.exe "$@"
    return
  fi
  if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    docker "$@"
    return
  fi
  echo "ERROR: Docker no encontrado."
  echo ""
  echo "Opciones:"
  echo "  1) Abre Docker Desktop en Windows y espera a que diga 'Running'"
  echo "  2) Settings → Resources → WSL Integration → activa tu distro"
  echo "  3) En WSL ejecuta: wsl --shutdown  (desde PowerShell) y vuelve a abrir la terminal"
  echo "  4) O instala Postgres en WSL: bash scripts/install-postgres-wsl.sh"
  exit 1
}

echo "Iniciando PostgreSQL (docker compose)..."
if ! docker_cmd info &>/dev/null; then
  echo ""
  echo "ERROR: Docker Desktop no responde."
  echo "Abre Docker Desktop en Windows y espera a que inicie por completo."
  exit 1
fi

docker_cmd compose up -d

echo ""
echo "Esperando que PostgreSQL acepte conexiones..."
for i in {1..30}; do
  if docker_cmd compose exec -T postgres pg_isready -U alquila -d alquila_dev &>/dev/null; then
    echo "PostgreSQL listo en localhost:5432"
    exit 0
  fi
  sleep 1
done

echo "El contenedor arrancó pero pg_isready no respondió. Revisa: docker compose logs postgres"
exit 1
