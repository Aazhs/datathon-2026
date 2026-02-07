# Datathon 2026 Registration Website

A simple hackathon registration website built with FastAPI.

## Features

- 🎨 Beautiful landing page with event details
- 📝 Registration form with validation
- 💾 Stores registrations in Supabase (optional) or locally (JSONL fallback)
- 🚀 Fast and responsive design

## Setup Instructions

### 1. Install Dependencies

**macOS/Linux:**
```bash
pip install -r requirements.txt
```

**Windows:**
```bash
pip install -r requirements.txt
```

**Note:** If using Python 3.14, you may encounter compatibility issues. Use Python 3.11-3.13 instead:
- macOS/Linux: `python3.13 -m venv venv`
- Windows: `py -3.13 -m venv venv`

### 2. Configure Environment

Copy `.env.example` to `.env` to customize local settings:

**macOS/Linux:**
```bash
cp .env.example .env
```

**Windows (Command Prompt):**
```bash
copy .env.example .env
```

**Windows (PowerShell):**
```bash
Copy-Item .env.example .env
```

Edit `.env`:

- Local fallback storage:
    - `REGISTRATIONS_PATH`: where to store registrations on disk (default: `data/registrations.jsonl`)

- Supabase (optional, enables cloud storage):
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY` (recommended for public forms with RLS policy)
    - Or `SUPABASE_SERVICE_ROLE_KEY` (server-side only, keep secret)

When Supabase is configured, the app writes to the Supabase table `public.registrations`.
When Supabase is not configured, the app appends to `data/registrations.jsonl`.

Verify what the server is using via: `GET /health`.

### 3. Supabase Setup (Optional)

1. Create a Supabase project
2. In Supabase Dashboard → SQL Editor, run:
     - `supabase/schema.sql`
3. If you want anonymous inserts (public form), also run:
     - `supabase/rls.sql`

Important notes:
- The required table name is `registrations` in the `public` schema.
- The `consent` column is `NOT NULL`. The app stores `consent` as `yes` (checked) or `no` (unchecked).

### 4. Run the Application

**macOS/Linux:**
```bash
python main.py
```

**Windows:**
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload
```

The application will be available at `http://localhost:8000`

## Project Structure

```
datathon-2026/
├── main.py                 # FastAPI application
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── .env                   # Your actual environment variables (create this)
├── supabase/
│   ├── schema.sql          # Supabase table schema (optional)
│   └── rls.sql             # RLS + grants for public inserts (optional)
├── templates/
│   ├── landing.html       # Landing page
│   └── register.html      # Registration page
├── data/                  # Local storage (created at runtime)
│   └── registrations.jsonl # Registration records (JSON Lines)
└── static/
    └── css/
        └── style.css      # Styling
```

## API Endpoints

- `GET /` - Landing page
- `GET /register` - Registration form
- `POST /register` - Submit registration
- `GET /health` - Health check

## Go Live (Deployment)

For production, prefer Supabase (or another real database). If you rely on local file storage, mount a persistent volume.

### Option A: Docker (recommended)

1. Build and run locally:

```bash
docker build -t datathon-2026 .
docker run -p 8000:8000 datathon-2026
```

2. Deploy the same image to Render / Railway / Fly.io / Azure Container Apps.

### Option B: Render / Railway (no Docker knowledge needed)

- Start command:

```bash
gunicorn -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

- If using Supabase, set `SUPABASE_URL` + `SUPABASE_ANON_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) in your hosting platform.
- If using local file storage, set `REGISTRATIONS_PATH` to a mounted volume path.

## Tech Stack

- **Backend**: FastAPI
- **Storage**: Supabase (Postgres) or local JSONL fallback
- **Frontend**: HTML, CSS (Jinja2 templates)
- **Styling**: Custom CSS with gradient design
