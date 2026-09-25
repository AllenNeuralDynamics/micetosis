import logging
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


logger = logging.getLogger(__name__)

Protocol = Literal["tcp", "inproc", "ipc", "ws", "wss"]

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CONFIG_PATH = REPO_ROOT / "config.json"


class RouterClientSettings(BaseModel):
    model_config = ConfigDict(extra="allow")

    protocol: Protocol = Field(default="tcp")
    interface: str = Field(default="localhost")
    rpc_port: int = Field(default=5555)
    broadcast_port: int = Field(default=5556)


class ServerConfig(BaseModel):
    model_config = ConfigDict(extra="allow")

    url: str = Field(default="http://localhost")
    port: int = Field(default=8000)
    router_client: RouterClientSettings = Field(default_factory=RouterClientSettings)
    rpcs_endpoint: str = Field(default="/api/metadata/rpc")
    streams_endpoint: str = Field(default="/api/metadata/streams")
    offer_endpoint: str = Field(default="/api/offer")


class Widget(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str = Field(default="action")
    bindings: dict[str, str] = Field(default_factory=dict)


class Config(BaseModel):
    model_config = ConfigDict(extra="allow")

    title: str = Field(default="Micetosis")
    server: ServerConfig = Field(default_factory=ServerConfig)
    widgets: dict[str, Widget] = Field(default_factory=dict)


def load_config(path: Path | None = None) -> Config:
    """Load config from a JSON file.
    If Path is provided, loads from that path. If not, looks for `config.json` at the repo root.
    """
    path = path or DEFAULT_CONFIG_PATH
    if not path.exists():
        logger.warning("config file not found at %s; using defaults", path)
        return Config()
    return Config.model_validate_json(path.read_text(encoding="utf-8"))
