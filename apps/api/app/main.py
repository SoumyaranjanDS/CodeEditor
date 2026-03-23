import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .runner import execute_run
from .schemas import HealthResponse, RunRequest, RunResponse

logger = logging.getLogger(__name__)
settings = get_settings()

app = FastAPI(title=settings.api_title, version=settings.api_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_allow_origins),
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
        logger.exception("Unexpected execution failure")
        raise HTTPException(
            status_code=500,
            detail="Internal execution error.",
        ) from exc
