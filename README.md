# Datathon 2026

Registration website for Datathon 2026 — a multi-round data science competition. Built with FastAPI, Supabase, and a playable Space Shooter mini-game in the hero section.

![Python](https://img.shields.io/badge/Python-3.11+-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688) ![License](https://img.shields.io/badge/License-MIT-green)

## Features

- Dark cyberpunk/gaming themed UI (monospace headings, neon accents, `#0a0a0a` background)
- Playable HTML5 Canvas space shooter embedded in the hero section
- Event timeline, round structure, pricing, and registration flow
- **Authentication** — Supabase Auth with signup, login, logout, and session refresh
- Registration form backed by Supabase (PostgreSQL)
- Fully responsive — mobile touch controls for the game
- No external image assets — all visuals are geometric/CSS

## Security

- HTTP-only & Secure cookies for auth tokens (Secure flag auto-enabled in production via `ENV=production`)
- `SameSite=lax` cookies to mitigate CSRF
- Open-redirect prevention on login `next` parameter
- Server-side input validation (email & phone format) on registration
- Internal error messages are logged server-side and never leaked to users
- Passwords enforced to be ≥ 6 characters

## Quick Start

```bash
# Clone
git clone https://github.com/<your-username>/datathon-2026.git
cd datathon-2026

# Virtual env
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install deps
pip install -r requirements.txt

# Configure env
cp .env.example .env
# Edit .env with your Supabase URL + Key

# Run
uvicorn main:app --reload
```

Open [http://localhost:8000](http://localhost:8000)

## Environment Variables

Create a `.env` file with:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
ENV=production          # enables Secure cookie flag (omit for local dev)
```

Get these from [Supabase](https://supabase.com) → Project Settings → API.

## Database Setup

Create a `registrations` table in Supabase:

```sql
CREATE TABLE registrations (
  id BIGSERIAL PRIMARY KEY,
  team_name TEXT NOT NULL,
  university TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  leader_name TEXT NOT NULL,
  leader_email TEXT NOT NULL,
  leader_phone TEXT NOT NULL,
  member2_name TEXT NOT NULL,
  member2_email TEXT NOT NULL,
  member2_phone TEXT NOT NULL,
  member3_name TEXT NOT NULL,
  member3_email TEXT NOT NULL,
  member3_phone TEXT NOT NULL,
  member4_name TEXT NOT NULL,
  member4_email TEXT NOT NULL,
  member4_phone TEXT NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Project Structure

```
datathon-2026/
├── main.py                 # FastAPI app (routes, auth, Supabase client)
├── requirements.txt        # Python dependencies
├── .env                    # Supabase credentials (not committed)
├── templates/
│   ├── landing.html        # Landing page (hero, timeline, rounds, pricing)
│   ├── signup.html         # Account creation page
│   ├── login.html          # Login page
│   ├── dashboard.html      # Authenticated dashboard
│   └── register.html       # Team registration form
└── static/
    ├── css/
    │   └── style.css       # Dark/cyberpunk theme
    ├── images/
    └── js/
        └── space-shooter.js # Canvas space shooter game
```

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Landing page |
| GET | `/signup` | Signup form |
| POST | `/signup` | Create account |
| GET | `/login` | Login form |
| POST | `/login` | Authenticate |
| GET | `/logout` | Log out & clear session |
| GET | `/dashboard` | Authenticated dashboard |
| GET | `/register` | Team registration form (auth required) |
| POST | `/register` | Submit registration (auth required) |
| GET | `/health` | Health check |

## Space Shooter Controls

| Input | Action |
|-------|--------|
| Arrow Keys / A-D | Move left/right |
| Space / Arrow Up | Shoot |
| Enter | Restart after game over |
| Touch + drag (mobile) | Move + auto-fire |
| Tap (mobile) | Restart after game over |

## Deployment

Recommended: **[Render](https://render.com)** (free tier)

- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Plan:** Free

## Tech Stack

- **Backend:** FastAPI + Uvicorn
- **Database:** Supabase (PostgreSQL)
- **Frontend:** Jinja2 templates, vanilla CSS/JS
- **Game:** HTML5 Canvas API
