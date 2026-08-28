# GeoMine

**GeoMine** is an AI-powered geospatial intelligence and satellite monitoring platform designed to detect illegal mining operations, monitor lease boundary compliance, and assess environmental encroachment in real time.

Combining deep learning satellite image classification (PyTorch EfficientNet-B0), GIS boundary geometry computation (Shapely & PyProj), and multimodal AI reasoning (Google Gemini API), GeoMine provides regulatory authorities, environmental auditors, and enterprise inspectors with actionable geospatial insights.

---

## Key Features

- **Deep Learning Satellite Scan (`/api/v1/scan`)**
  - High-precision mine patch detection powered by PyTorch (EfficientNet-B0).
  - Calculates total mined area (in square meters and hectares) and generates mine density heatmaps.
  - Spatial filtering to exclude noise smaller than threshold parameters ($400\text{m}^2$).

- **Interactive Lease Geofencing & Encroachment Inspection (`/api/v1/boundary`, `/api/v1/inspect`)**
  - Interactive polygon drawing tools powered by `@geoman-io/leaflet-geoman-free`.
  - Precise spatial overlap computation using Shapely & PyProj to compare active mining zones against legal lease boundaries.
  - Real-time **Encroachment Alert HUD** flagging unauthorized mining beyond designated parameters.

- **GeoLens AI Assistant (`/api/v1/chat`)**
  - Integrated intelligent chatbot powered by **Google Gemini API** (`google-genai` SDK).
  - Contextual querying for satellite telemetry, environmental risk analysis, and regulatory compliance guidelines.

- **Next-Gen GIS Dashboard**
  - Built with **Next.js 14**, **Leaflet**, and **Tailwind CSS**.
  - Dynamic **Region Search** with global geocoding support for quick map navigation.
  - Customizable **Basemap Switcher** supporting OpenStreetMap, Esri World Imagery (High-Res Satellite), and OpenTopoMap.
  - Real-time Summary HUDs displaying active region metrics and alert notifications.

---

## Project Architecture

```
geomine/
├── backend/                  # FastAPI Backend Service
│   ├── app/
│   │   ├── core/            # Deep learning inference engine & model loader
│   │   ├── db/              # Database models & SQLite caching
│   │   ├── routers/         # API Endpoint Routers
│   │   │   ├── scan.py      # Satellite patch scanning
│   │   │   ├── inspect.py   # Detailed inspection pipeline
│   │   │   ├── boundary.py  # Spatial boundary & encroachment checking
│   │   │   └── chat.py      # Gemini AI GeoLens Chatbot backend
│   │   ├── config.py        # Centralized Pydantic settings & configuration
│   │   └── main.py          # FastAPI application entry point
│   ├── weight/              # PyTorch model weights (best_efficientnet_b0.pth)
│   ├── Dockerfile           # Docker container configuration
│   └── requirements.txt     # Python dependencies
│
├── frontend/                 # Next.js 14 Frontend Application
│   ├── app/                 # App router pages & layouts
│   ├── components/
│   │   ├── Map/             # Leaflet containers, Overlays, RegionSearch
│   │   ├── Chat/            # GeoLens Gemini Chatbot UI
│   │   ├── UI/              # SummaryHUD, EncroachmentAlertHUD, Toolbars
│   │   └── Inspection/      # Inspection detail drawers
│   ├── services/            # Axios API client integrations
│   ├── store/               # Zustand state management
│   └── package.json         # Node.js dependencies
└── README.md
```

---

## Tech Stack

### **Frontend**
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Lucide Icons
- **Mapping & GIS**: Leaflet, React-Leaflet, Leaflet Geoman (`@geoman-io/leaflet-geoman-free`)
- **State Management**: Zustand
- **HTTP Client**: Axios

### **Backend**
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.10+)
- **Server**: Uvicorn
- **AI & Deep Learning**: PyTorch (`torch`, `torchvision`), Google GenAI SDK (`google-genai`)
- **Geospatial & Image Processing**: EarthEngine API, Shapely, PyProj, Rasterio, NumPy, Pillow
- **Data Validation & Settings**: Pydantic v2 / Pydantic Settings

---

## Quick Start Guide

### Prerequisites

Ensure you have the following installed on your system:
- **Node.js**: v18.0.0 or higher
- **Python**: 3.10 or higher
- **Git**
- *(Optional)* **Docker**

---

### 1. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Create a `.env` file inside the `backend/` directory:
   ```env
   PROJECT_NAME="GeoMine AI Engine"
   VERSION="1.0.0"
   DEBUG=True
   GEMINI_API_KEY="your_google_gemini_api_key_here"
   ```

5. **Start the FastAPI backend server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   The backend API will be live at `http://localhost:8000`. API Swagger documentation will be available at `http://localhost:8000/docs`.

---

### 2. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node.js packages**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables** *(Optional)*:
   Create a `.env.local` file inside the `frontend/` directory if connecting to a custom backend URL:
   ```env
   NEXT_PUBLIC_API_BASE_URL="http://localhost:8000/api/v1"
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser to launch the GeoMine interface.

---

## API Reference Summary

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `GET /` | `GET` | Health check endpoint returning API status. |
| `POST /api/v1/scan` | `POST` | Scans a bounding box ROI for mine patches and returns spatial coordinates & density data. |
| `POST /api/v1/inspect` | `POST` | Runs detailed analysis on a specific mined region. |
| `POST /api/v1/boundary` | `POST` | Computes spatial overlap between legal lease polygons and detected mining zones. |
| `POST /api/v1/chat` | `POST` | Interacts with the GeoLens Gemini AI Assistant for satellite analysis QA. |

---

## Docker Deployment (Backend)

To run the backend inside a Docker container:

1. **Build the Docker image**:
   ```bash
   cd backend
   docker build -t geomine-backend .
   ```

2. **Run the container**:
   ```bash
   docker run -d -p 8000:8000 --env-file .env geomine-backend
   ```

---

## License

This project is developed for AI-assisted geospatial analysis and illegal mining monitoring. See project license details if applicable.
