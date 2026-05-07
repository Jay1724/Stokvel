# Stokvel Manager

A full-stack web application for managing South African stokvels. Track members, contributions, meetings, and payment reminders in one place.

## Features

- **Stokvel Management** — Create and manage multiple stokvels
- **Member Tracking** — Add members with roles (chairperson, secretary, treasurer, member), contact details, and join dates
- **Contribution Tracking** — Record payments per member per month, mark paid/outstanding, view collection progress
- **Meeting Management** — Schedule meetings, track attendance, record minutes
- **Reminders** — Create payment and meeting reminders; auto-generate reminders for members who haven't paid this month

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS|
| Backend  | Node.js, Express, TypeScript            |
| Database | SQLite (via better-sqlite3)             |

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### Run in development

Open two terminals:

```bash
# Terminal 1 — Backend API (port 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
Stokvel/
├── backend/
│   ├── src/
│   │   ├── database/db.ts        # SQLite schema & connection
│   │   ├── routes/
│   │   │   ├── stokvels.ts
│   │   │   ├── members.ts
│   │   │   ├── contributions.ts
│   │   │   ├── meetings.ts
│   │   │   └── reminders.ts
│   │   └── index.ts              # Express server
│   └── data/stokvel.db           # SQLite database (auto-created)
└── frontend/
    └── src/
        ├── api/index.ts          # Axios API client
        ├── pages/
        │   ├── StokvelSelector.tsx
        │   ├── Dashboard.tsx
        │   ├── Members.tsx
        │   ├── Contributions.tsx
        │   ├── Meetings.tsx
        │   └── Reminders.tsx
        └── components/Layout.tsx
```

## API Endpoints

| Method | Path                                         | Description                        |
|--------|----------------------------------------------|------------------------------------|
| GET    | /api/stokvels                                | List all stokvels                  |
| POST   | /api/stokvels                                | Create stokvel                     |
| GET    | /api/stokvels/:id/stats                      | Dashboard stats                    |
| GET    | /api/stokvels/:id/members                    | List members                       |
| POST   | /api/stokvels/:id/members                    | Add member                         |
| GET    | /api/stokvels/:id/contributions              | List contributions                 |
| POST   | /api/stokvels/:id/contributions              | Record contribution                |
| GET    | /api/stokvels/:id/contributions/status/:y/:m | Payment status for month           |
| GET    | /api/stokvels/:id/meetings                   | List meetings                      |
| POST   | /api/stokvels/:id/meetings                   | Schedule meeting                   |
| PUT    | /api/stokvels/:id/meetings/:id/attendance    | Update attendance                  |
| GET    | /api/stokvels/:id/reminders                  | List reminders                     |
| POST   | /api/stokvels/:id/reminders/generate-payment | Auto-generate payment reminders    |
