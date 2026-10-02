# eSQLer

**eSQLer** is a visual, browser-based database schema designer and SQL query tool. Build relational schemas on an interactive canvas, generate production-ready SQL (SQLite, PostgreSQL, MySQL, MongoDB), run queries against a real in-browser SQLite engine, and get AI-powered query suggestions — all without leaving the browser.

---

## Features

### Visual Schema Designer
- Drag-and-drop canvas powered by React Flow
- Create, rename, and resize tables with live column editing
- Define columns with types, primary keys, auto-increment, and nullable flags
- Draw foreign key relationships visually between tables
- Tables are color-coded and animated for at-a-glance clarity

### SQL Code Generation
- One-click DDL generation targeting SQLite, PostgreSQL, MySQL, or MongoDB
- Topologically sorted output respects foreign key dependencies
- Monaco-powered code editor with syntax highlighting and copy support

### Data Studio (Live SQLite)
- In-browser SQLite engine via WebAssembly (`sql.js`)
- Insert, edit (double-click cells), and delete rows in a live spreadsheet view
- Seed sample data for rapid prototyping
- All executed SQL statements are surfaced in a transparency toast

### Query Studio
- Write and execute raw SQL against the in-browser database
- Real-time result tables with column headers
- Parameterized query support

### AI Query Assist
- Describe what you want in plain English
- Powered by Groq (Llama 3) or Google Gemini
- Schema-aware: the AI receives your full table/column context to generate accurate queries

### External Database Connectivity
- Connect to live PostgreSQL or MySQL databases via the backend proxy
- Connection strings are encrypted with AES-256-GCM before being stored
- Real-time query execution with Socket.IO

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Canvas | React Flow (`@xyflow/react`) |
| In-Browser DB | sql.js (SQLite WASM) |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Code Editor | Monaco Editor |
| Backend | Node.js, Express, TypeScript |
| Real-time | Socket.IO |
| App Database | MongoDB (Mongoose) |
| AI | Groq SDK, Google Gemini API |
| Security | Helmet, AES-256-GCM, Rate Limiting |

---

## Project Structure

```
esqler/
├── client/                  # Vite + React frontend
│   ├── src/
│   │   ├── components/      # TableNode, DataStudio, QueryStudio, AiAssistDrawer, ...
│   │   ├── compiler/        # SQL DDL generators per dialect + validator
│   │   ├── services/        # SQLite WASM engine wrapper
│   │   ├── store/           # Zustand global schema store
│   │   └── types/           # Shared TypeScript types
│   └── public/
│       └── sql-wasm.wasm    # SQLite WebAssembly binary
│
└── server/                  # Express backend
    └── src/
        └── index.ts         # API routes, Socket.IO, AI proxy, DB connector
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- A MongoDB Atlas URI (for the backend)
- Groq and/or Gemini API keys (optional, for AI assist)

### 1. Clone the repository

```bash
git clone https://github.com/yashsushil16/eSQLer.git
cd eSQLer
```

### 2. Start the frontend

```bash
cd client
npm install
npm run dev
# Runs at http://localhost:5173
```

### 3. Start the backend

```bash
cd server
npm install
cp .env.example .env
# Fill in your values in .env
npm run dev
# Runs at http://localhost:3001
```

### 4. Configure environment variables

Copy `server/.env.example` to `server/.env` and fill in:

```env
PORT=3001
CORS_ORIGIN=http://localhost:5173

MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/esqler

JWT_SECRET=<your_strong_secret>

# 64 hex characters = 32 bytes (required for AES-256-GCM encryption)
DB_ENCRYPTION_KEY=<64_hex_chars>

# Optional — for AI query assistance
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
```

> The frontend works fully standalone (schema design, SQL generation, SQLite data studio) without a running backend. The backend is only required for AI assist and external DB connectivity.

---

## Usage

1. **Add a table** — Click `Add Table` in the toolbar. A new node appears on the canvas.
2. **Edit columns** — Click inside the table node to rename it or add/remove columns. Set types, primary keys, and auto-increment flags inline.
3. **Draw relationships** — Drag from a column's source handle to another column's target handle to define a foreign key.
4. **Generate SQL** — Open the `Code` panel to get DDL for your chosen dialect.
5. **Run queries** — Switch to `Query Studio` to write raw SQL against the live in-browser SQLite.
6. **Browse data** — Use `Data Studio` to view, insert, and edit rows in a spreadsheet.
7. **Ask AI** — Open `AI Assist`, type a plain-English request, and get a ready-to-run query.

---

## Roadmap

- Firebase authentication (sign in with Google)
- Save/load schemas to MongoDB (cloud persistence)
- Schema version history and diffing
- Import from existing database (DDL introspection)
- Export to ERD image

---

## License

MIT
