#!/usr/bin/env bash
# Alternativa sin Docker: PostgreSQL nativo en Ubuntu/WSL
set -e

echo "Instalando PostgreSQL en WSL..."
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib

sudo service postgresql start || sudo pg_ctlcluster 16 main start 2>/dev/null || true

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='alquila'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER alquila WITH PASSWORD 'alquila' CREATEDB;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='alquila_dev'" | grep -q 1 || \
  sudo -u postgres createdb -O alquila alquila_dev

sudo -u postgres psql -d alquila_dev -c "GRANT ALL ON SCHEMA public TO alquila;"

# Probar conexión
PGPASSWORD=alquila psql -h localhost -U alquila -d alquila_dev -c "SELECT 1 AS ok;" || {
  echo "Si falla la conexión, agrega en /etc/postgresql/*/main/pg_hba.conf:"
  echo "  local   all   alquila   md5"
  echo "  host    all   alquila   127.0.0.1/32   md5"
  echo "Luego: sudo service postgresql restart"
}

echo ""
echo "PostgreSQL instalado. Usa en .env:"
echo "DATABASE_URL=postgresql://alquila:alquila@localhost:5432/alquila_dev"
echo ""
echo "Luego: npm run dev"
