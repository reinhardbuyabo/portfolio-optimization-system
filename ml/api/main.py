from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from loguru import logger
from config.core import settings
from processing.data_manager import load_pipeline, load_preprocessor

from .routes.health import router as health_router
from .routes.lstm import router as lstm_router
from .routes.garch import router as garch_router


class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        with logger.contextualize(path=request.url.path, method=request.method):
            try:
                import time
                start = time.perf_counter()
                response = await call_next(request)
                duration = time.perf_counter() - start
                response.headers["X-Process-Time"] = f"{duration:.6f}"
                logger.info(
                    "{method} {path} completed in {duration:.4f}s status={status}",
                    method=request.method,
                    path=request.url.path,
                    duration=duration,
                    status=response.status_code,
                )
                return response
            except Exception as e:
                logger.exception("Unhandled exception while processing request: {}", e)
                raise


def create_app() -> FastAPI:
    app = FastAPI(
        title="Portfolio ML API",
        version=settings.MODEL_VERSION,
        openapi_url="/api/v1/openapi.json",
        docs_url="/api/v1/docs",
        redoc_url="/api/v1/redoc",
    )

    # Logger configuration
    logger.remove()
    logger.add(lambda msg: print(msg, end=""), level="INFO")

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Timing and logging middleware
    app.add_middleware(TimingMiddleware)

    @app.on_event("startup")
    async def startup_event():
        logger.info("Starting up and loading models…")
        app.state.pipeline = load_pipeline(file_name=f"{settings.MODEL_VERSION}.h5")
        app.state.preprocessor = load_preprocessor(file_name=f"preprocessor_{settings.MODEL_VERSION}.joblib")
        logger.info("Models loaded: version {}", settings.MODEL_VERSION)

    # Routers
    app.include_router(health_router, prefix="/api/v1", tags=["health"]) 
    app.include_router(lstm_router, prefix="/api/v1/predict", tags=["lstm"]) 
    app.include_router(garch_router, prefix="/api/v1/predict", tags=["garch"]) 

    return app


app = create_app()