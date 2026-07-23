from pydantic import BaseModel, Field


class RouteMetadata(BaseModel):
    """Base model for route metadata."""

    name: str = Field(..., description="The one-liner call_name of the RPC.")
    route: str | None = Field(None, description="Corresponding FastAPI route for the RPC.")
    params_schema: dict | None = Field(None, description="Schema for the RPC parameters.")
    return_schema: dict | None = Field(None, description="Schema for the RPC return value.")
    description: str | None = Field(None, description="Description of the RPC.")


class StreamMetadata(RouteMetadata):
    """Model for Stream metadata."""

    encoding: str


class RPCMetadata(RouteMetadata):
    """Model for RPC metadata."""

    pass


class ManualStreamMetadata(StreamMetadata):
    """Model for Manual Stream metadata."""

    frequency_hz: float = Field(..., description="Frequency of the manual stream in Hz.")
    enabled: bool = Field(..., description="Whether the manual stream is enabled or not.")


class PeriodicStreamMetadata(StreamMetadata):
    """Model for Periodic Stream metadata."""

    pass
