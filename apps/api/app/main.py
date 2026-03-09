import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .runner import execute_run
from .schemas import HealthResponse, RunRequest, RunResponse

app = FastAPI(title="AuraCode API", version="0.1.0")

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
allowed_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def healthcheck() -> HealthResponse:
    return HealthResponse(status="ok")


@app.post("/api/run", response_model=RunResponse)
def run_code(payload: RunRequest) -> RunResponse:
    try:
        return execute_run(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc