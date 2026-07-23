import argparse
import logging
from importlib.resources import files
from pathlib import Path

import uvicorn
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from web_ui_backend.app_factory import create_app
from web_ui_backend.config import load_config


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def serve_static_frontend(app):
    # register routers using config...
    static_path = Path(files("prototome_web_ui") / "dist")
    app.mount("/assets", StaticFiles(directory=static_path / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        return FileResponse(static_path / "index.html")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=None)
    parser.add_argument("--log-level", type=str, default="INFO", choices=["INFO", "DEBUG"])
    parser.add_argument("--dev", action="store_true", default=False)

    args = parser.parse_args()

    logging.getLogger().setLevel(args.log_level.upper())

    config = load_config(args.config)
    app = create_app(config)

    # TODO: implement serving up static frontend files in production mode
    # serve_static_frontend(app)

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level=args.log_level.lower())


if __name__ == "__main__":
    main()
