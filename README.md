# ⚡ ELITE OS — Your Personal Command Center

> The definitive personal growth operating system for Diego, Pedro & Cristopher.

---

## Overview

ELITE OS is a full-stack web application that serves as a personal growth command center. It combines gym tracking, nutrition logging, cardio monitoring, habit building, goal management, language learning, and competitive gamification in a single cyberpunk-aesthetic platform.

**Feel:** Notion + Duolingo + MyFitnessPal + Habitica + GitHub contributions — all in one.

## Features

- **Dashboard** — Activity heatmap, radar charts, weekly XP, streak counters
- **Gym Tracker** — Routines, personal records, muscle group analytics
- **Nutrition** — Macro tracking, meal logging, weekly charts
- **Cardio** — Distance, time, calories, weekly trends
- **Habits** — Daily habits, 365-day heatmaps, streaks
- **Goals** — SMART goals with visual progress rings
- **Learning** — Language & skill tracking, XP system
- **Finance** — Income/expense tracking, monthly summaries
- **Leaderboard** — Real-time competition between Diego, Pedro & Cristopher
- **Chat** — Real-time messaging via Socket.io
- **Gamification** — XP, levels, ranks (Bronze → Diamond), badges, missions

## Tech Stack

| Layer        | Technology                                  |
|-------------|----------------------------------------------|
| Frontend    | Next.js 14 (App Router) + TypeScript         |
| Styling     | TailwindCSS + Framer Motion                  |
| Charts      | Recharts                                     |
| State       | Zustand + React Query                        |
| Backend     | Node.js + Express                            |
| Database    | PostgreSQL + Prisma ORM                      |
| Auth        | JWT + bcrypt                                 |
| Real-time   | Socket.io                                    |
| Deploy      | Vercel (frontend) + Railway (backend)        |

## Project Structure

```
elite-os/
├── apps/
│   ├── frontend/          # Next.js 14 App Router
│   │   └── src/
│   │       ├── app/       # Routes & pages
│   │       ├── components/ # UI components
│   │       ├── hooks/     # Custom hooks
│   │       ├── lib/       # API client, utils
│   │       ├── store/     # Zustand stores
│   │       └── types/     # TypeScript types
│   └── backend/           # Express API
│       ├── src/
│       │   ├── routes/    # API routes
│       │   ├── middleware/ # Auth middleware
│       │   └── seed.js    # Database seeder
│       └── prisma/        # Database schema
└── packages/
    └── shared/            # Shared types (future)
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm 9+

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_ORG/elite-os.git
cd elite-os
npm install
cd apps/backend && npm install
cd ../frontend && npm install
cd ../..
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb eliteos

# Or using psql:
psql -U postgres -c "CREATE DATABASE eliteos;"

# Configure environment
cp apps/backend/.env.example apps/backend/.env
# Edit DATABASE_URL in apps/backend/.env
```

### 3. Run Migrations & Seed

```bash
cd apps/backend
npx prisma db push
npm run db:seed
```

This creates 3 users with 60 days of realistic data each.

### 4. Start Development

```bash
# From root (both servers)
npm run dev

# Or individually:
npm run dev:backend   # API on :3001
npm run dev:frontend  # Web on :3000
```

### 5. Access

| URL                        | Description        |
|----------------------------|--------------------|
| http://localhost:3000      | Web app            |
| http://localhost:3001/api  | REST API           |
| http://localhost:5555      | Prisma Studio (DB) |

### Demo Credentials

| User        | Email                     | Password     |
|-------------|---------------------------|--------------|
| Diego       | diego@eliteos.app         | Elite2024!   |
| Pedro       | pedro@eliteos.app         | Elite2024!   |
| Cristopher  | cristopher@eliteos.app    | Elite2024!   |

## API Routes

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/dashboard/stats

GET    /api/habits
POST   /api/habits
POST   /api/habits/:id/log
GET    /api/habits/logs/heatmap

GET    /api/gym/sessions
POST   /api/gym/sessions
GET    /api/gym/stats
GET    /api/gym/records

GET    /api/nutrition/today
POST   /api/nutrition/meals

GET    /api/cardio/sessions
POST   /api/cardio/sessions

GET    /api/goals
POST   /api/goals
POST   /api/goals/:id/progress

GET    /api/leaderboard
GET    /api/learning/sessions
GET    /api/finance/entries

GET    /api/messages/:userId
POST   /api/messages
```

## Gamification System

| Action             | XP    |
|--------------------|-------|
| Gym session        | 50 XP |
| Cardio session     | 30 XP |
| Habit completion   | 10 XP |
| Learning session   | 40 XP/hour |
| Goal completed     | 100 XP |

| Rank      | XP Required |
|-----------|-------------|
| Bronze    | 0           |
| Silver    | 501         |
| Gold      | 2,001       |
| Platinum  | 5,001       |
| Diamond   | 10,001      |

## Git Workflow

```
main          # Production
dev           # Active development
feature/*     # Feature branches
fix/*         # Bug fixes
```

## Deploy

### Frontend → Vercel
```bash
cd apps/frontend
vercel deploy
```

### Backend → Railway
1. Push to GitHub
2. Connect repo in Railway
3. Set environment variables
4. Deploy

---

Built with ⚡ by Diego, Pedro & Cristopher | 2026
