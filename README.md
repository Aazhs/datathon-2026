# Datathon 2026 Registration Website

A simple hackathon registration website built with FastAPI and Supabase.

## Features

- 🎨 Beautiful landing page with event details
- 📝 Registration form with validation
- 💾 Data storage using Supabase
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

### 2. Configure Supabase

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Create a table called `registrations` with the following schema:

```sql
CREATE TABLE registrations (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  university TEXT NOT NULL,
  team_name TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);
```

4. Copy `.env.example` to `.env` and add your Supabase credentials:

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

Edit `.env` and add:
- `SUPABASE_URL`: Your project URL (found in Project Settings > API)
- `SUPABASE_KEY`: Your anon/public key (found in Project Settings > API)

### 3. Run the Application

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
├── templates/
│   ├── landing.html       # Landing page
│   └── register.html      # Registration page
└── static/
    └── css/
        └── style.css      # Styling
```

## API Endpoints

- `GET /` - Landing page
- `GET /register` - Registration form
- `POST /register` - Submit registration
- `GET /health` - Health check

## Tech Stack

- **Backend**: FastAPI
- **Database**: Supabase (PostgreSQL)
- **Frontend**: HTML, CSS (Jinja2 templates)
- **Styling**: Custom CSS with gradient design
