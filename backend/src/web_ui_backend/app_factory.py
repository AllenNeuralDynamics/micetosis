from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from one_liner.client import RouterClient
from web_ui_backend.config import load_config
from web_ui_backend.router_factory import create_zmq_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> Any:
    """Lifespan context: clean up tasks on shutdown"""
    yield
    # stop_event.set()
    # cancel_tasks()


def create_app(config=load_config()) -> FastAPI:
    app = FastAPI(lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=["*"])

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/", tags=["Health"])
    def health_check() -> dict[str, Any]:
        """Health check."""
        return {"message": "Healthy!"}

    @app.get("/api/config", tags=["Config"])
    def get_config() -> dict[str, Any]:
        """Get UI config."""
        return config.ui.model_dump()

    # TODO: this will hang if router server isn't spun up. Should we timeout
    # Also, we get 502 gateway error in the UI, probably catch the hang and notify UI that 
    # no router server has been connected
    router_client: RouterClient = RouterClient(**config.server.router_client.model_dump())
    app.include_router(create_zmq_router(router_client), prefix="/api")

    return app
