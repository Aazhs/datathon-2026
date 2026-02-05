from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from datetime import datetime

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


@app.get("/", response_class=HTMLResponse)
async def landing_page(request: Request):
    """Landing page"""
    return templates.TemplateResponse("landing.html", {"request": request})


@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    """Registration page"""
    return templates.TemplateResponse("register.html", {"request": request})


@app.post("/register")
async def submit_registration(
    request: Request,
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    university: str = Form(...),
    team_name: str = Form(None),
):
    """Handle registration form submission"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Insert registration data into Supabase
        data = {
            "name": name,
            "email": email,
            "phone": phone,
            "university": university,
            "team_name": team_name,
            "registered_at": datetime.utcnow().isoformat()
        }
        
        response = supabase.table("registrations").insert(data).execute()
        
        return templates.TemplateResponse(
            "register.html",
            {
                "request": request,
                "success": True,
                "message": "Registration successful! We'll contact you soon."
            }
        )
    
    except Exception as e:
        return templates.TemplateResponse(
            "register.html",
            {
                "request": request,
                "error": True,
                "message": f"Registration failed: {str(e)}"
            }
        )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "supabase_connected": supabase is not None}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
