# Tulip Garden - Project Summary

## What It Is
Tulip Garden is an interactive Bitcoin Ordinals community site featuring ASCII tulip art, tool discovery, community polls, comments, and tool submissions. Built for Casey Rodarmor's ecosystem.

## Live URLs
- **Frontend**: Deployed on Vercel (auto-deploys from GitHub on push)
- **Backend API**: https://tulip-garden-api.fly.dev
- **GitHub**: https://github.com/madisonoliviaa/tulip-garden

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14 + TypeScript | App Router, React components, UI |
| Backend | Rust (Axum + SQLite) | API server, shared data, vote tracking |
| Frontend Hosting | Vercel | Auto-deploys from GitHub pushes |
| Backend Hosting | Fly.io | Docker container, persistent volume for SQLite |
| Database | SQLite (via rusqlite) | Polls, comments, clicks, submissions, IP tracking |

---

## Project Structure

```
tulip-garden/
├── .gitignore
├── server/                          # Rust backend
│   ├── src/
│   │   └── main.rs                  # All API endpoints (single file)
│   ├── Cargo.toml                   # Rust dependencies
│   ├── Cargo.lock
│   ├── Dockerfile                   # Multi-stage build for Fly.io
│   └── fly.toml                     # Fly.io deployment config
└── tulip-garden/                    # Next.js frontend
    ├── app/
    │   ├── TulipGarden.tsx          # Main component (all UI + logic)
    │   ├── page.tsx                 # Root page
    │   ├── layout.tsx               # Root layout
    │   └── poll/
    │       └── page.tsx             # Standalone shareable poll page
    ├── public/
    ├── tsconfig.json                # TypeScript config (strict mode)
    ├── package.json
    ├── .env.local                   # Local dev: API points to localhost:3002
    └── next.config.ts
```

---

## Backend API Endpoints

```
GET  /api/tool-clicks          → All tool click counts
POST /api/tool-clicks/:tool    → Increment click, return new count

GET  /api/poll                 → All vote counts
GET  /api/poll/my-vote         → What the current IP voted for (or null)
POST /api/poll/:id             → Vote (IP-limited, one vote per IP)

GET  /api/comments             → All comments (newest first)
POST /api/comments             → Create comment (name optional)
POST /api/comments/:id/like    → Like a comment
POST /api/comments/:id/dislike → Dislike a comment

GET  /api/submissions          → All tool submissions
POST /api/submissions          → Submit a new tool
```

---

## Database Tables

```sql
tool_clicks   (tool TEXT PK, count INTEGER)
poll_votes    (id TEXT PK, count INTEGER)
poll_voters   (ip TEXT PK, choice TEXT)          -- IP-based vote limiting
comments      (id INTEGER PK, name, text, ts, likes, dislikes)
submissions   (id INTEGER PK, name, url, desc, type, ts)
```

---

## Key Features Built

### Frontend (TulipGarden.tsx)
- ASCII tulip art rendering with terminal-style UI
- "Tragic Eden" game description and lore
- Tool chooser with click tracking
- Community poll with vote/change-vote UI
- Comment system with like/dislike reactions
- Tool submission form
- Refresh button for re-rendering tulips
- Machine UI panel
- Green monospace terminal aesthetic throughout
- Shareable poll page (/poll) designed for Twitter screenshots

### Backend (main.rs)
- All shared data persisted in SQLite
- IP-based poll vote limiting (one vote per IP, can change vote)
- IP extraction from Fly-Client-IP / X-Forwarded-For headers
- CORS enabled for frontend access
- Environment variable config (PORT, DATABASE_PATH)

### IP Vote Limiting (latest feature)
- New `poll_voters` table tracks IP → choice
- First vote: records IP + choice, increments count
- Duplicate vote (same choice): returns 409 Conflict
- Change vote: decrements old choice, increments new, updates record
- `/api/poll/my-vote` endpoint lets frontend check server-side vote state
- Frontend checks server on page load (overrides localStorage if server knows)

---

## Deployment Details

### Fly.io (Backend)
- App name: `tulip-garden-api`
- Region: `iad` (US East)
- 1 machine, 1GB RAM, 1 CPU
- Persistent volume: `tulip_data` (1GB) mounted at `/data`
- Database lives at `/data/tulip_garden.db`
- Deploy command: `flyctl deploy` (from server/ directory)
- Requires: `$env:PATH += ";C:\Users\Owner\.fly\bin"` in PowerShell

### Vercel (Frontend)
- Auto-deploys on `git push` to main branch
- Environment: `NEXT_PUBLIC_API_URL` set to Fly.io API URL in production
- Local dev uses `.env.local` pointing to `http://localhost:3002/api`

---

## Development Commands

```powershell
# Start local Rust backend
cd C:\Users\Owner\Downloads\tulip-garden\server
cargo run
# Server runs on http://localhost:3002

# Start local frontend
cd C:\Users\Owner\Downloads\tulip-garden\tulip-garden
bun dev
# App runs on http://localhost:3000

# TypeScript check (no build needed)
cd C:\Users\Owner\Downloads\tulip-garden\tulip-garden
./node_modules/.bin/tsc --noEmit

# Format Rust code
cd C:\Users\Owner\Downloads\tulip-garden\server
cargo fmt

# Deploy backend
cd C:\Users\Owner\Downloads\tulip-garden\server
$env:PATH += ";C:\Users\Owner\.fly\bin"
flyctl deploy

# Deploy frontend (push triggers Vercel auto-deploy)
cd C:\Users\Owner\Downloads\tulip-garden
git add <files>
git commit -m "message"
git push
```

---

## Coding Guidelines (Casey's Rules)
- No comments in code
- `cargo add` for Rust dependencies
- `cargo fmt` after changes
- Correctness and clarity over performance
- Rust for backend, TypeScript for frontend

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| `flyctl` not recognized in PowerShell | `$env:PATH += ";C:\Users\Owner\.fly\bin"` |
| `cargo build` access denied on server.exe | Stop running server: `Stop-Process -Name server -Force` |
| fly.toml overwritten by `flyctl launch` | Re-add [mounts] and DATABASE_PATH manually |
| 2 Fly machines but 1 volume → 502 errors | `flyctl scale count 1` |
| `.next` folder locked during build | Use `tsc --noEmit` instead of `next build` |

---

## Git History (Key Commits)
1. Initial project setup + Rust backend + frontend API integration
2. Fly.io deployment config + production env vars
3. TypeScript conversion (all .js → .tsx, strict mode, zero errors)
4. **Add IP-based poll vote limiting** (latest)
