# GEMINI.md

This file provides context for the Gemini AI assistant about the `datathon-2026` project.

## Project Overview

This project is a Python-based web application for the "Datathon 2026" event. It serves as a registration platform for participating teams.

The application is built using the **FastAPI** web framework and utilizes a **Supabase** (PostgreSQL) backend for data storage and user authentication. The frontend is rendered using **Jinja2** templates with vanilla CSS and JavaScript. A notable feature is an interactive **HTML5 Canvas space shooter game** embedded in the landing page.

The project is configured for serverless deployment on **Vercel**.

### Key Technologies

*   **Backend**: Python, FastAPI, Uvicorn
*   **Database & Auth**: Supabase
*   **Frontend**: Jinja2, HTML, CSS, JavaScript
*   **Deployment**: Vercel

### Core Functionality

*   User account creation (signup), login, and logout.
*   A dashboard for authenticated users.
*   A registration form for teams to submit their details.
*   A landing page with event details and the space shooter game.

## Building and Running

The project uses a Python virtual environment and installs dependencies from `requirements.txt`.

### Local Development

1.  **Create and activate a virtual environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```

2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Configure environment variables:**
    *   Create a `.env` file in the project root.
    *   Add the following variables with your Supabase credentials:
        ```
        SUPABASE_URL=your-supabase-url
        SUPABASE_KEY=your-supabase-anon-key
        ```

4.  **Run the development server:**
    ```bash
    uvicorn main:app --reload
    ```
    The application will be available at `http://localhost:8000`.

### Deployment

The project is configured for deployment on Vercel. The `vercel.json` file specifies the build configuration. To deploy, you can use the Vercel CLI or import the repository into the Vercel web UI.

## Project Structure

```
datathon-2026/
├── main.py                 # FastAPI app (routes, auth, Supabase client)
├── api/
│   └── index.py            # Vercel serverless entry point
├── vercel.json             # Vercel deployment config
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

## Development Conventions

*   The main application logic is contained within `main.py`.
*   The `api/index.py` file acts as a simple wrapper to make the application compatible with Vercel's serverless environment.
*   Frontend templates are located in the `templates` directory and use Jinja2 for dynamic content.
*   Static assets (CSS, JavaScript, images) are served from the `static` directory.
*   Authentication is handled using JWTs stored in secure, HTTP-only cookies.
*   Environment variables are loaded from a `.env` file using `python-dotenv`.
