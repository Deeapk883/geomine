from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import scan, inspect, boundary

app = FastAPI(
    title="GeoMine AI API",
    description="Backend service for satellite open-pit mining detection and material analysis.",
    version="1.0.0"
)

# Enable CORS for local React/Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Router Endpoints
app.include_router(scan.router, prefix="/api/v1", tags=["Scanning"])
app.include_router(inspect.router, prefix="/api/v1", tags=["Inspection"])
app.include_router(boundary.router, prefix="/api/v1", tags=["Boundary Geofencing"])

@app.get("/")
def health_check():
    return {"status": "online", "message": "GeoMine AI Engine Running"}