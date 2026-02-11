from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from supabase import create_client, Client
import os
import re
from dotenv import load_dotenv
from datetime import datetime, timezone

# Load environment variables
load_dotenv()

app = FastAPI(title="Datathon 2026")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✓ Connected to Supabase successfully")
    except Exception as e:
        print(f"Warning: Could not connect to Supabase: {e}")
        print("App will run but registration submissions won't be saved")
else:
    print("Warning: Supabase credentials not found in environment variables")
    print("App will run but registration submissions won't be saved")


# ── Auth helpers ────────────────────────────────────────────
def get_current_user(request: Request):
    """Return the current authenticated user dict or None."""
    access_token = request.cookies.get("access_token")
    refresh_token = request.cookies.get("refresh_token")
    if not access_token or not supabase:
        return None
    try:
        resp = supabase.auth.get_user(access_token)
        if resp and resp.user:
            meta = resp.user.user_metadata or {}
            return {
                "email": resp.user.email,
                "id": resp.user.id,
                "name": meta.get("full_name", resp.user.email),
            }
    except Exception:
        # Token might be expired – try refreshing
        if refresh_token:
            try:
                session = supabase.auth.refresh_session(refresh_token)
                if session and session.user:
                    meta = session.user.user_metadata or {}
                    return {
                        "email": session.user.email,
                        "id": session.user.id,
                        "name": meta.get("full_name", session.user.email),
                        "_new_access": session.session.access_token,
                        "_new_refresh": session.session.refresh_token,
                    }
            except Exception:
                pass
    return None


def set_auth_cookies(response: Response, session):
    """Write access + refresh tokens into HTTP-only cookies."""
    is_prod = os.getenv("ENV", "development") == "production"
    response.set_cookie(
        "access_token",
        session.access_token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,  # 7 days
    )
    response.set_cookie(
        "refresh_token",
        session.refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        max_age=60 * 60 * 24 * 30,  # 30 days
    )


def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")


def has_existing_registration(email: str) -> bool:
    """Return True if this auth email has already submitted a team registration."""
    if not supabase:
        return False
    try:
        # First try registered_by (new column), fall back to leader_email
        result = (
            supabase.table("registrations")
            .select("id")
            .eq("registered_by", email)
            .limit(1)
            .execute()
        )
        if result.data:
            return True
        # Fallback: also check leader_email for older rows
        result = (
            supabase.table("registrations")
            .select("id")
            .eq("leader_email", email)
            .limit(1)
            .execute()
        )
        return bool(result.data)
    except Exception:
        return False


# ── Pages ───────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def landing_page(request: Request):
    """Landing page"""
    user = get_current_user(request)
    return templates.TemplateResponse("landing.html", {"request": request, "user": user})


@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    """Registration page (requires login)"""
    user = get_current_user(request)
    if not user:
        return RedirectResponse("/login?next=/register", status_code=302)
    already_registered = has_existing_registration(user["email"])
    return templates.TemplateResponse(
        "register.html",
        {"request": request, "user": user, "already_registered": already_registered},
    )


# ── Signup ──────────────────────────────────────────────────

@app.get("/signup", response_class=HTMLResponse)
async def signup_page(request: Request):
    user = get_current_user(request)
    if user:
        return RedirectResponse("/dashboard", status_code=302)
    return templates.TemplateResponse("signup.html", {"request": request})


@app.post("/signup")
async def signup_submit(
    request: Request,
    full_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
):
    if password != confirm_password:
        return templates.TemplateResponse(
            "signup.html",
            {"request": request, "error": True, "message": "Passwords do not match."},
        )
    if len(password) < 6:
        return templates.TemplateResponse(
            "signup.html",
            {"request": request, "error": True, "message": "Password must be at least 6 characters."},
        )
    if not supabase:
        return templates.TemplateResponse(
            "signup.html",
            {"request": request, "error": True, "message": "Auth service unavailable."},
        )
    try:
        res = supabase.auth.sign_up(
            {"email": email, "password": password, "options": {"data": {"full_name": full_name}}}
        )
        # Supabase may require email confirmation depending on project settings.
        if res.session:
            # Auto-confirmed – log them in immediately
            resp = RedirectResponse("/dashboard", status_code=302)
            set_auth_cookies(resp, res.session)
            return resp
        # Email confirmation required
        return templates.TemplateResponse(
            "signup.html",
            {
                "request": request,
                "success": True,
                "message": "Account created! Check your email to confirm, then log in.",
            },
        )
    except Exception as e:
        msg = str(e)
        if "already registered" in msg.lower() or "already been registered" in msg.lower():
            msg = "An account with this email already exists."
        return templates.TemplateResponse(
            "signup.html",
            {"request": request, "error": True, "message": msg},
        )


# ── Login ───────────────────────────────────────────────────

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    user = get_current_user(request)
    if user:
        return RedirectResponse("/dashboard", status_code=302)
    next_url = request.query_params.get("next", "")
    return templates.TemplateResponse("login.html", {"request": request, "next": next_url})


@app.post("/login")
async def login_submit(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    next_url: str = Form(""),
):
    if not supabase:
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": True, "message": "Auth service unavailable."},
        )
    try:
        res = supabase.auth.sign_in_with_password({"email": email, "password": password})
        # Prevent open redirect — only allow relative paths on this origin
        if next_url and next_url.startswith("/") and not next_url.startswith("//"):
            redirect_to = next_url
        else:
            redirect_to = "/dashboard"
        resp = RedirectResponse(redirect_to, status_code=302)
        set_auth_cookies(resp, res.session)
        return resp
    except Exception as e:
        msg = str(e)
        if "invalid" in msg.lower() or "credentials" in msg.lower():
            msg = "Invalid email or password."
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": True, "message": msg, "next": next_url},
        )


# ── Logout ──────────────────────────────────────────────────

@app.get("/logout")
async def logout(request: Request):
    resp = RedirectResponse("/", status_code=302)
    clear_auth_cookies(resp)
    try:
        token = request.cookies.get("access_token")
        if token and supabase:
            supabase.auth.sign_out()
    except Exception:
        pass
    return resp


# ── Dashboard (protected) ──────────────────────────────────

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request):
    user = get_current_user(request)
    if not user:
        return RedirectResponse("/login?next=/dashboard", status_code=302)
    return templates.TemplateResponse("dashboard.html", {"request": request, "user": user})


@app.post("/register")
async def submit_registration(
    request: Request,
    team_name: str = Form(...),
    university: str = Form(...),
    team_size: int = Form(...),
    problem_statement: str = Form(...),
    m1_name: str = Form(...),
    m1_email: str = Form(...),
    m1_phone: str = Form(...),
    m2_name: str = Form(""),
    m2_email: str = Form(""),
    m2_phone: str = Form(""),
    m3_name: str = Form(""),
    m3_email: str = Form(""),
    m3_phone: str = Form(""),
    m4_name: str = Form(""),
    m4_email: str = Form(""),
    m4_phone: str = Form(""),
):
    """Handle registration form submission (requires login)"""
    user = get_current_user(request)
    if not user:
        return RedirectResponse("/login?next=/register", status_code=302)

    # Prevent duplicate registrations
    if has_existing_registration(user["email"]):
        return templates.TemplateResponse(
            "register.html",
            {
                "request": request,
                "user": user,
                "already_registered": True,
                "error": True,
                "message": "You have already registered a team.",
            },
        )

    # Clamp team_size to 1-4
    team_size = max(1, min(4, team_size))

    # Build members list based on team_size
    members = [(m1_name, m1_email, m1_phone)]
    if team_size >= 2:
        members.append((m2_name, m2_email, m2_phone))
    if team_size >= 3:
        members.append((m3_name, m3_email, m3_phone))
    if team_size >= 4:
        members.append((m4_name, m4_email, m4_phone))

    # Input validation
    email_re = re.compile(r"^[\w.+-]+@[\w-]+\.[\w.-]+$")
    phone_re = re.compile(r"^[\d\s\+\-()]{7,20}$")
    for name, email, phone in members:
        if not name.strip():
            return templates.TemplateResponse(
                "register.html",
                {"request": request, "user": user, "error": True, "message": "All member names are required."},
            )
        if not email_re.match(email):
            return templates.TemplateResponse(
                "register.html",
                {"request": request, "user": user, "error": True, "message": f"Invalid email: {email}"},
            )
        if not phone_re.match(phone):
            return templates.TemplateResponse(
                "register.html",
                {"request": request, "user": user, "error": True, "message": f"Invalid phone number for {name}."},
            )

    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")

        data = {
            "team_name": team_name,
            "university": university,
            "problem_statement": problem_statement,
            "team_size": team_size,
            "leader_name": m1_name,
            "leader_email": m1_email,
            "leader_phone": m1_phone,
            "member2_name": m2_name if team_size >= 2 else None,
            "member2_email": m2_email if team_size >= 2 else None,
            "member2_phone": m2_phone if team_size >= 2 else None,
            "member3_name": m3_name if team_size >= 3 else None,
            "member3_email": m3_email if team_size >= 3 else None,
            "member3_phone": m3_phone if team_size >= 3 else None,
            "member4_name": m4_name if team_size >= 4 else None,
            "member4_email": m4_email if team_size >= 4 else None,
            "member4_phone": m4_phone if team_size >= 4 else None,
            "registered_by": user["email"],
            "registered_at": datetime.now(timezone.utc).isoformat(),
        }

        response = supabase.table("registrations").insert(data).execute()

        return templates.TemplateResponse(
            "register.html",
            {
                "request": request,
                "user": user,
                "already_registered": True,
                "success": True,
                "message": "Registration successful! Team lead will receive portal credentials shortly."
            }
        )

    except Exception as e:
        # Log the real error server-side; don't leak internals to the client
        print(f"Registration error: {e}")
        return templates.TemplateResponse(
            "register.html",
            {
                "request": request,
                "user": user,
                "error": True,
                "message": "Registration failed. Please try again or contact support."
            }
        )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "supabase_connected": supabase is not None}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
