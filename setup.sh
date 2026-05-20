#!/usr/bin/env bash
# ELITE OS — Quick Setup Script
# Usage: bash setup.sh

set -euo pipefail
GREEN='\033[0;32m' RED='\033[0;31m' YELLOW='\033[1;33m' NC='\033[0m'
log() { echo -e "${GREEN}[ELITE OS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; }

log "Starting ELITE OS setup..."

# ─── Check Node.js ────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  err "Node.js not found. Install Node 18+ first."
  exit 1
fi
NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
log "Node.js: v$NODE_VER"

# ─── Install PostgreSQL (Arch Linux) ─────────────────────────────
if ! command -v psql &>/dev/null; then
  log "Installing PostgreSQL..."
  sudo pacman -S --noconfirm postgresql
  sudo systemctl enable postgresql
  sudo -u postgres initdb -D /var/lib/postgres/data
  sudo systemctl start postgresql
  sudo -u postgres createdb eliteos
  log "PostgreSQL installed and database created."
else
  log "PostgreSQL already installed."
  # Ensure eliteos db exists
  sudo -u postgres psql -c "CREATE DATABASE eliteos;" 2>/dev/null || warn "Database may already exist."
fi

# ─── Backend setup ────────────────────────────────────────────────
log "Installing backend dependencies..."
cd apps/backend
npm install

if [ ! -f .env ]; then
  cp .env.example .env
  log "Created apps/backend/.env — edit DATABASE_URL if needed."
fi

log "Pushing database schema..."
npx prisma db push

log "Seeding database with demo data..."
node src/seed.js

cd ../..

# ─── Frontend setup ───────────────────────────────────────────────
log "Installing frontend dependencies..."
cd apps/frontend
npm install

if [ ! -f .env.local ]; then
  cat > .env.local <<'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
EOF
  log "Created apps/frontend/.env.local"
fi

cd ../..

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ELITE OS — Setup Complete! ⚡      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e " Run:  ${YELLOW}npm run dev${NC}  (from project root)"
echo ""
echo " URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo " Login with:"
echo "   diego@eliteos.app       Elite2024!"
echo "   pedro@eliteos.app       Elite2024!"
echo "   cristopher@eliteos.app  Elite2024!"
echo ""
