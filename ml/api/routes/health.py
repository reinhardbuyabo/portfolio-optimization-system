from fastapi import APIRouter
from datetime import datetime
import os

router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "env": os.getenv("RAILWAY_ENVIRONMENT", "local"),
    }


@router.get("/readiness")
async def readiness():
    # In a more robust version we would verify model availability on disk/ram
    return {"ready": True, "timestamp": datetime.utcnow().isoformat()}