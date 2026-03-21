<p align="center">
  <img src="frontend/src/assets/Logo.png" alt="AdaptIQ logo" width="120" />
</p>

<h1 align="center">AdaptIQ</h1>

<p align="center">
  Skill Gap Analyzer + Adaptive Upskilling Roadmap
</p>

<p align="center">
  <img alt="Frontend: React" src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=000" />
  <img alt="Backend: Flask" src="https://img.shields.io/badge/Backend-Flask-000000?logo=flask&logoColor=fff" />
  <img alt="Database: MongoDB" src="https://img.shields.io/badge/DB-MongoDB-47A248?logo=mongodb&logoColor=fff" />
</p>

<p align="center">
  <a href="#quickstart-local">Quickstart</a> ·
  <a href="#what-you-get-features">Features</a> ·
  <a href="#architecture-high-level">Architecture</a> ·
  <a href="#deployment-notes-vercel">Deploy</a>
</p>

Upload your resume and a job description. AdaptIQ compares skills, surfaces gaps, and generates an actionable learning plan — with a diagnostic quiz and a shareable PDF report.

## Why this exists

Most job seekers don’t fail because they lack talent — they fail because they don’t know what to learn next. AdaptIQ turns a vague “upskill” goal into a prioritized roadmap with measurable progress.

## What you get (features)

- Resume vs Job Description skill gap analysis (PDF/DOCX/TXT supported)
- Match Rate + Market Fit scorecards
- AI reasoning trace for “why this is a gap”
- Adaptive learning roadmap with a skill dependency graph (prereqs → next steps)
- One-click course recommendation per skill (Udemy link via similarity matching)
- Diagnostic quiz generator from a job description (15–20 questions, skill-tagged, timed)
- Progress tracker, study-time estimate, and copy-to-clipboard share summary
- Export a multi-page PDF report (includes QR codes to learning searches/resources)
- User accounts & profile persistence in MongoDB (signup/login, job title, skills, tagline)

## Tech stack

- Frontend: React + Vite, TailwindCSS, Chart.js, jsPDF, QRCode, React Router
- Backend: Flask, MongoDB (PyMongo), Groq LLM, PyPDF2, python-docx, scikit-learn
- Deployment: Vercel configs included (`vercel.json`, `backend/vercel.json`)

## Dependencies

Full lists live in `frontend/package.json` and `backend/requirements.txt`. Key dependencies:

- Frontend: `react`, `react-router-dom`, `axios`, `chart.js` + `react-chartjs-2`, `tailwindcss`, `jspdf`, `qrcode`, `html2canvas`
- Backend: `Flask`, `Flask-Cors`, `pymongo`, `python-dotenv`, `groq`, `PyPDF2`, `python-docx`, `pandas`, `scikit-learn`, `neattext`

## Architecture (high level)

```mermaid
flowchart LR
  UI[React + Vite UI] -->|multipart upload| API[Flask API]
  API -->|extract text| PARSE[PDF/DOCX Parser]
  API -->|LLM prompt| GROQ[Groq Chat Completions]
  API -->|gap output| UI
  API -->|persist profile| MONGO[(MongoDB)]
  UI -->|generate quiz| API
  UI -->|export report| PDF[jsPDF + QRCode]
  API -->|course link| REC[TF‑IDF Similarity (sampled_data.csv)]
```

## Skill-gap analysis logic (high level)

1. Parse inputs: the backend receives `resume` + `job_description`, extracts text (PDF via `PyPDF2`, DOCX via `python-docx`, or plain text fallback).
2. Extract skills with AI: the backend prompts the Groq model to return a strict JSON object containing:
   - `skills_from_resume`
   - `skills_required_in_job`
   - `matching_skills`
   - `skills_to_improve`
3. Validate + return: JSON is parsed/validated and returned to the frontend.
4. Score + visualize: the UI derives match/fit scores from the counts and renders dashboards, the dependency graph, and the learning roadmap.
5. Recommend resources: `/recommend_course` uses TF‑IDF + cosine similarity over `backend/sampled_data.csv` to output a best-match Udemy course link.
6. Optional diagnostic quiz: `/generate-quiz` generates a skill-tagged quiz from the job description; the UI grades results and maps them into the same “skills required / gaps” shape.

## Quickstart (local)

### Prerequisites

- Node.js 18+ (or 20+)
- Python 3.10+ (3.11 recommended)
- A MongoDB URI (Atlas or local)
- A Groq API key

### 1) Backend (Flask)

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
## Windows (PowerShell):
# Copy-Item .env.example .env
## macOS/Linux:
# cp .env.example .env
python app.py
```

Backend defaults to `http://localhost:5000`.

### 2) Frontend (React + Vite)

```bash
cd frontend
## Windows (PowerShell):
# Copy-Item .env.example .env
## macOS/Linux:
# cp .env.example .env
npm install
npm run dev
```

Open the app at `http://localhost:5173`.

## Usage (demo flow)

1. Sign up / log in.
2. Go to the Analyzer, upload:
   - `resume` (PDF/DOCX/TXT)
   - `job_description` (PDF/DOCX/TXT)
3. Review skill matches + gaps, explore the dependency graph, and mark progress.
4. (Optional) Generate a Diagnostic Quiz from the job description.
5. Export the PDF report and share the summary.

## Frontend scripts

From `frontend/`:

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview build locally
- `npm run lint` — run ESLint

## Quick API checks (optional)

Course recommendation:

```bash
curl -X POST "http://localhost:5000/recommend_course" -H "Content-Type: application/json" -d '{"resource":"React"}'
```

Skill analyzer (multipart):

```bash
curl -X POST "http://localhost:5000/skill-analyzer" -F "resume=@./resume.pdf" -F "job_description=@./jd.pdf"
```

Diagnostic quiz (multipart):

```bash
curl -X POST "http://localhost:5000/generate-quiz" -F "job_description=@./jd.pdf"
```

## Deployment notes (Vercel)

- Frontend: deploy `frontend/` as a Vite app; set `VITE_API_BASE_URL` to your backend URL.
- Backend: `backend/vercel.json` is configured for `@vercel/python`; set `MONGODB_URI` and `groq_api` in Vercel environment variables.

## Environment variables

### Backend (`backend/.env`)

| Variable              | Required | Description                                            |
| --------------------- | -------: | ------------------------------------------------------ |
| `MONGODB_URI`         |      Yes | MongoDB connection string (recommended)                |
| `connec_string`       |       No | Legacy fallback for MongoDB URI (prefer `MONGODB_URI`) |
| `MONGODB_DB`          |       No | Database name (default: `UserTest`)                    |
| `MONGODB_AUTH_SOURCE` |       No | Auth DB if your user isn’t on the default auth DB      |
| `groq_api`            |      Yes | Groq API key                                           |
| `GROQ_MODEL`          |       No | Model name (default: `llama-3.1-8b-instant`)           |
| `PORT`                |       No | Flask port (default: `5000`)                           |
| `FLASK_DEBUG`         |       No | Set `1` to enable debug (default: `1`)                 |

### Frontend (`frontend/.env`)

| Variable            | Required | Description                                    |
| ------------------- | -------: | ---------------------------------------------- |
| `VITE_API_BASE_URL` |       No | Backend URL (default: `http://localhost:5000`) |

## API endpoints (backend)

- `POST /api/signup` — create an account
- `POST /api/login` — login
- `GET /api/skills?email=...` — fetch saved skills
- `POST /api/skills` — add a skill to the profile
- `GET /api/user/job?email=...` / `POST /api/user/job` — get/update job title
- `PUT /api/user/update` — update name or password
- `GET /api/user/tagline?email=...` / `POST /api/user/tagline` — get/update tagline
- `POST /skill-analyzer` — analyze resume + job description (multipart form-data)
- `POST /generate-quiz` — generate a skill-tagged diagnostic quiz from a job description (multipart)
- `POST /recommend_course` — get a recommended course link for a skill (JSON)

## Troubleshooting

- Auth endpoints return `503`: MongoDB is unreachable; verify `MONGODB_URI`, network access, and IP allowlist (Atlas).
- “Invalid MONGODB_URI” / multiple `@`: URL-encode special characters in your password (for example `@` → `%40`).
- CORS / API not reachable: ensure `VITE_API_BASE_URL` points to the backend and the backend is running on the expected port.

## Project structure

```
.
├─ backend/                 # Flask API + ML utilities
└─ frontend/                # React UI (Vite)
```

## Security note

Never commit secrets. Keep API keys and database URIs in `.env` files and rotate any credentials that were previously exposed.

## Team

- Siri Karra — `heyysiri`
- Aditya Donapati — `adonapati`
- Manogna Vadla — `manognavadla`

## Support

Open an issue with steps to reproduce and (if possible) the job description/resume without personal data.
