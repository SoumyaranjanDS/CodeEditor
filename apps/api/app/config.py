from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

DEFAULT_CORS_ALLOW_ORIGINS = (
    "https://auraeditor.netlify.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)


def _get_int(name: str, default: int, minimum: int = 1) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default

    try:
        parsed = int(raw_value)
    except ValueError:
        return default

    return max(parsed, minimum)


def _get_csv(name: str, default: tuple[str, ...]) -> tuple[str, ...]:
    raw_value = os.getenv(name)
    if not raw_value:
        return default

    values = tuple(item.strip() for item in raw_value.split(",") if item.strip())
    return values or default


@dataclass(frozen=True)
class Settings:
    api_title: str
    api_version: str
    cors_allow_origins: tuple[str, ...]
    run_timeout_seconds: int
    compile_timeout_seconds: int
    max_output_chars: int
    max_benchmark_runs: int


@lru_cache
def get_settings() -> Settings:
    return Settings(
        api_title="AuraCode API",
        api_version="0.1.0",
        cors_allow_origins=_get_csv("CORS_ALLOW_ORIGINS", DEFAULT_CORS_ALLOW_ORIGINS),
        run_timeout_seconds=_get_int("RUN_TIMEOUT_SECONDS", default=5),
        compile_timeout_seconds=_get_int("COMPILE_TIMEOUT_SECONDS", default=12),
        max_output_chars=_get_int("MAX_OUTPUT_BYTES", default=65_536),
        max_benchmark_runs=_get_int("MAX_BENCHMARK_RUNS", default=10),
    )
