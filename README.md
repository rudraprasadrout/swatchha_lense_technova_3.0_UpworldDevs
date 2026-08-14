# SwachhLens 🌿

**Team UpWorld Devs | TechNova 3.0 Hackathon**

A smart civic waste reporting platform built for Bhubaneswar Municipal Corporation (BMC). Citizens snap a photo of garbage, blocked drains, or sanitation issues — and the system automatically classifies the waste, blurs faces/plates for privacy, detects duplicate reports nearby, and routes the right cleanup crew.

---

## What It Does

- **Photo-based reporting** — Citizens capture waste issues on their phone, no login needed
- **AI waste classification** — Mistral Pixtral vision model categorizes the waste type and estimates volume
- **Privacy first** — OpenCV YuNet face detection + Haar cascade plate detection auto-pixelates faces and license plates before anything gets stored
- **20m deduplication** — If someone reports an issue within 20 meters of an existing ticket, we merge them instead of creating duplicates. Urgency goes up with more unique reporters
- **Anti-spam** — Same person can't boost priority by submitting the same report repeatedly
- **Urgency scoring** — Algorithmic score (1-10) based on waste type, volume, drain blockage, fire hazard, sensitive area proximity, and community confirmations
- **Municipal geofencing** — Checks if the location is within BMC limits. If not, tells the citizen which external authority to contact
- **Multilingual UI** — English, Odia (ଓଡ଼ିଆ), and Hindi (हिन्दी) with one-click switching
- **Voice notes** — Web Speech API for regional language voice input, with Mistral-powered native script conversion
- **Officer dashboard** — Map view, ticket management, AI-powered city advisor chatbot

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python, Flask, Gunicorn |
| AI/Vision | Mistral AI (Pixtral 12B), OpenCV |
| Database | Firebase Firestore (primary) + SQLite (local backup) |
| Frontend | Vanilla HTML/CSS/JS |
| Deployment | Render (backend), Netlify (frontend) |

## Project Structure

```
├── backend/
│   ├── app.py              # flask routes and API endpoints
│   ├── firebase_db.py      # dual-write to firestore + sqlite
│   ├── anonymizer.py       # face & plate detection + pixelation
│   ├── vision.py           # mistral pixtral image analysis
│   ├── scoring.py          # urgency score calculation + geofencing
│   ├── dedup.py            # spatial deduplication (haversine)
│   ├── db.py               # sqlite schema + migrations
│   ├── test_integration.py # end-to-end API tests
│   └── models/             # yunet face detection weights
├── frontend/
│   ├── index.html           # landing page
│   ├── citizen.html         # citizen report form
│   ├── admin.html           # officer dashboard
│   ├── about.html           # system architecture page
│   ├── css/style.css        # all styles (dark/light themes)
│   ├── js/
│   │   ├── citizen.js       # form logic + report submission
│   │   ├── i18n.js          # translations + theme toggle
│   │   └── voice.js         # speech recognition
│   └── assets/config.js     # API URL configuration
├── requirements.txt
├── Procfile                 # heroku/render start command
├── render.yaml              # render deployment config
├── netlify.toml             # netlify deployment config
└── .env                     # API keys (not committed)
```

## Getting Started

### Prerequisites

- Python 3.9+
- A Mistral API key (get one at [console.mistral.ai](https://console.mistral.ai))

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/rudraprasadrout/swatchha_lense_technova_3.0_UpworldDevs.git
   cd swatchha_lense_technova_3.0_UpworldDevs
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Create a `.env` file** in the project root
   ```
   MISTRAL_API_KEY=your_key_here
   ```

4. **Run the backend**
   ```bash
   python backend/app.py
   ```
   Server starts at `http://localhost:5000`

5. **Open the frontend**
   
   Open `frontend/index.html` in your browser, or just visit `http://localhost:5000` (the flask server serves the frontend too).

### Deployment

- **Backend** → Deploy to [Render](https://render.com) using `render.yaml`
- **Frontend** → Deploy to [Netlify](https://netlify.com) with publish directory set to `frontend/`
- Update `PRODUCTION_BACKEND_URL` in `frontend/assets/config.js` to match your Render URL

## API Endpoints

| Method | Endpoint | What it does |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/auth` | Officer login |
| POST | `/api/v1/report` | Submit a citizen report |
| GET | `/api/v1/reports` | Get all tickets |
| GET | `/api/v1/report/<id>/image` | Get ticket image |
| PATCH | `/api/v1/report/<id>/status` | Update ticket status |
| POST | `/api/v1/reports/summary` | AI executive summary |
| POST | `/api/v1/ai/analyze-city` | City advisor chatbot |

## Demo Credentials

For the officer portal:
- **ID:** `admin@swachhlens.gov.in`
- **Password:** `admin123`

## Team UpWorld Devs

Built with ☕ and late nights at TechNova 3.0

---

*SwachhLens — because every city deserves a cleaner lens.*