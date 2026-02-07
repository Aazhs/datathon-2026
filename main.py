from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from supabase import create_client, Client
import os
import shutil
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime
import json
import re
from typing import Any

# Load environment variables
_project_dir = Path(__file__).resolve().parent
_env_file = _project_dir / ".env"
_env_example_file = _project_dir / ".env.example"

if _env_file.exists():
    load_dotenv(_env_file)
    print("✓ Loaded environment from .env")
elif _env_example_file.exists():
    load_dotenv(_env_example_file)
    print("✓ Loaded environment from .env.example")
else:
    load_dotenv()

app = FastAPI(title="Datathon 2026")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")

# Optional Supabase client (enabled when env vars exist)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
    or os.getenv("SUPABASE_KEY")
)

supabase: Client | None = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✓ Connected to Supabase successfully")
    except Exception as e:
        print(f"Warning: Could not connect to Supabase: {e}")
        print("App will fall back to local registration storage")
else:
    print("ℹ Supabase not configured; using local registration storage")


def _registrations_path() -> Path:
    """Return the path where registrations are stored (JSONL)."""
    configured = os.getenv("REGISTRATIONS_PATH", "").strip()
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parent / "data" / "registrations.jsonl"


def _append_registration_local(payload: dict[str, Any]) -> None:
    """Append a single registration record to a local JSONL file."""
    out_path = _registrations_path()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=False) + "\n")


def _insert_registration(payload: dict[str, Any]) -> None:
    """Persist a registration. Uses Supabase when configured, else local JSONL."""
    if supabase is not None:
        supabase.table("registrations").insert(payload).execute()
        return
    _append_registration_local(payload)


def _ensure_latest_home_video() -> int:
    """Ensure static/media/video.mp4 matches the root video.mp4.

    Returns a version integer (mtime) for cache busting.
    """
    root_video = Path(__file__).resolve().parent / "video.mp4"
    target_video = Path(__file__).resolve().parent / "static" / "media" / "video.mp4"

    try:
        target_video.parent.mkdir(parents=True, exist_ok=True)

        if root_video.exists():
            copy_needed = (not target_video.exists())
            if not copy_needed:
                try:
                    copy_needed = (
                        root_video.stat().st_size != target_video.stat().st_size
                        or root_video.stat().st_mtime > target_video.stat().st_mtime
                    )
                except OSError:
                    copy_needed = True

            if copy_needed:
                shutil.copyfile(root_video, target_video)

        if target_video.exists():
            return int(target_video.stat().st_mtime)
    except Exception:
        pass

    return int(datetime.utcnow().timestamp())


@app.get("/", response_class=HTMLResponse)
async def landing_page(request: Request):
    """Landing page"""
    video_version = _ensure_latest_home_video()
    return templates.TemplateResponse(
        "landing.html",
        {"request": request, "video_version": video_version},
    )


@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    """Registration page"""
    video_version = _ensure_latest_home_video()
    return templates.TemplateResponse(
        "register.html",
        {"request": request, "video_version": video_version},
    )


@app.post("/register")
async def submit_registration(
    request: Request,
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    university: str = Form(...),
    department: str = Form(...),
    year: str = Form(...),
    participation: str = Form(...),
    team_name: str = Form(None),
    team_size: str = Form(None),
    team_members: str = Form(None),
    consent: str = Form(None),
):
    """Handle registration form submission"""
    try:
        video_version = _ensure_latest_home_video()

        def format_storage_error(exc: Exception) -> tuple[str, str | None]:
            """Return (human_message, code) for storage-layer exceptions."""
            code: str | None = None
            message = str(exc)

            # supabase-py / postgrest often attaches a dict payload as the first arg
            try:
                if getattr(exc, "args", None) and isinstance(exc.args[0], dict):
                    payload = exc.args[0]
                    code = payload.get("code")
                    msg = payload.get("message")
                    details = payload.get("details")
                    hint = payload.get("hint")

                    parts = []
                    if code:
                        parts.append(f"code={code}")
                    if msg:
                        parts.append(f"message={msg}")
                    if details:
                        parts.append(f"details={details}")
                    if hint:
                        parts.append(f"hint={hint}")
                    if parts:
                        message = " | ".join(parts)
            except Exception:
                pass

            # Fallback: try to infer code from the string
            if code is None and "'code':" in message:
                m = re.search(r"'code':\s*'([^']+)'", message)
                if m:
                    code = m.group(1)

            return message, code

        def clean(value: str | None) -> str:
            return (value or "").strip()

        name = clean(name)
        email = clean(email)
        phone = clean(phone)
        university = clean(university)
        department = clean(department)
        year = clean(year)
        participation = clean(participation)
        team_name = clean(team_name)
        team_size = clean(team_size)
        team_members = (team_members or "").strip()
        consent = clean(consent)

        # Enforce compulsory fields
        if not all([name, email, phone, university, department, year, participation]):
            return templates.TemplateResponse(
                "register.html",
                {
                    "request": request,
                    "video_version": video_version,
                    "error": True,
                    "message": "Please fill all required fields.",
                },
                status_code=400,
            )

        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
            return templates.TemplateResponse(
                "register.html",
                {
                    "request": request,
                    "video_version": video_version,
                    "error": True,
                    "message": "Please enter a valid email address.",
                },
                status_code=400,
            )

        digits = re.sub(r"\D", "", phone)
        if len(digits) < 10:
            return templates.TemplateResponse(
                "register.html",
                {
                    "request": request,
                    "video_version": video_version,
                    "error": True,
                    "message": "Please enter a valid phone number (10 digits).",
                },
                status_code=400,
            )

        if participation not in {"solo", "team"}:
            return templates.TemplateResponse(
                "register.html",
                {
                    "request": request,
                    "video_version": video_version,
                    "error": True,
                    "message": "Please select a valid participation type.",
                },
                status_code=400,
            )

        # Team-specific compulsory validation
        if participation == "team":
            if team_size not in {"2", "3", "4"}:
                return templates.TemplateResponse(
                    "register.html",
                    {
                        "request": request,
                        "video_version": video_version,
                        "error": True,
                        "message": "Please select your team size (2–4).",
                    },
                    status_code=400,
                )
            if not team_name:
                return templates.TemplateResponse(
                    "register.html",
                    {
                        "request": request,
                        "video_version": video_version,
                        "error": True,
                        "message": "Please enter a team name.",
                    },
                    status_code=400,
                )

            try:
                members = json.loads(team_members) if team_members else []
            except Exception:
                members = []

            expected = int(team_size)
            if not isinstance(members, list) or len(members) != expected:
                return templates.TemplateResponse(
                    "register.html",
                    {
                        "request": request,
                        "video_version": video_version,
                        "error": True,
                        "message": "Please fill all team member details.",
                    },
                    status_code=400,
                )

            for idx, member in enumerate(members, start=1):
                m_name = clean(member.get("name") if isinstance(member, dict) else "")
                m_email = clean(member.get("email") if isinstance(member, dict) else "")
                if not m_name:
                    return templates.TemplateResponse(
                        "register.html",
                        {
                            "request": request,
                            "video_version": video_version,
                            "error": True,
                            "message": f"Please enter Member {idx} name.",
                        },
                        status_code=400,
                    )
                if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", m_email):
                    return templates.TemplateResponse(
                        "register.html",
                        {
                            "request": request,
                            "video_version": video_version,
                            "error": True,
                            "message": f"Please enter a valid email for Member {idx}.",
                        },
                        status_code=400,
                    )
        else:
            team_name = ""
            team_size = ""
            team_members = ""

        # Consent is optional. Normalize to a non-null value for storage.
        consent_value = "yes" if consent == "yes" else "no"

        # Persist registration (Supabase if configured; otherwise local JSONL)
        team_members_json: Any = None
        if team_members:
            try:
                team_members_json = json.loads(team_members)
            except Exception:
                team_members_json = team_members

        data: dict[str, Any] = {
            "name": name,
            "email": email,
            "phone": phone,
            "university": university,
            "department": department,
            "year": year,
            "participation": participation,
            "team_name": team_name or None,
            "team_size": team_size or None,
            "team_members": team_members_json,
            "consent": consent_value,
            "registered_at": datetime.utcnow().isoformat() + "Z",
        }

        _insert_registration(data)
        
        return templates.TemplateResponse(
            "register.html",
            {
                "request": request,
                "video_version": video_version,
                "success": True,
                "message": "Registration successful! We'll contact you soon."
            }
        )
    
    except Exception as e:
        error_text, error_code = format_storage_error(e)

        if error_code == "42501" or "row-level security" in error_text.lower():
            return templates.TemplateResponse(
                "register.html",
                {
                    "request": request,
                    "video_version": _ensure_latest_home_video(),
                    "error": True,
                    "message": (
                        "Registration failed due to Supabase Row Level Security (RLS). "
                        "Your request is using the anon/authenticated role, but inserts are not permitted by the current RLS policy/grants. "
                        "Run supabase/rls.sql in Supabase SQL Editor (or disable RLS), or set SUPABASE_SERVICE_ROLE_KEY in .env to bypass RLS server-side. "
                        f"Details: {error_text}"
                    ),
                },
                status_code=403,
            )

        return templates.TemplateResponse(
            "register.html",
            {
                "request": request,
                "video_version": _ensure_latest_home_video(),
                "error": True,
                "message": f"Registration failed: {error_text}"
            }
        )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    storage = "supabase" if supabase is not None else "local"
    return {
        "status": "ok",
        "storage": storage,
        "supabase_connected": supabase is not None,
        "registrations_path": str(_registrations_path()),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
