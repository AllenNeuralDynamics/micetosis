import jsonref
from fastapi import APIRouter, HTTPException

from typing import Any

from one_liner.client import RouterClient
from web_ui_backend.metadata_model import (
    RPCMetadata,
    ManualStreamMetadata,
    PeriodicStreamMetadata,
    StreamMetadata,
)


def create_zmq_router(client: RouterClient) -> APIRouter:
    """
    Create a FastAPI router with endpoints for all ZMQ RPCs and streams, as well as metadata
    endpoints with information about the RPCs and streams.
    """
    router = APIRouter()

    # Get ZMQ streams and RPCs metadata
    rpcs = client.get_rpc_configurations(as_dict=True)[1]
    streams = client.get_stream_configurations(as_dict=True)[1]
    periodic_streams = streams.get("periodic_streams", {})
    manual_streams = streams.get("manual_streams", {})

    rpc_metadata: dict[str, RPCMetadata] = {}
    stream_metadata: dict[str, StreamMetadata] = {}

    for call_name in rpcs:
        rpc_metadata[call_name] = RPCMetadata(
            name=call_name,
            route=f"/api/{call_name}",
            params_schema=rpcs[call_name].get("params_schema"),
            return_schema=rpcs[call_name].get("return_schema"),
            description=rpcs[call_name].get("description"),
        )
        _add_rpc_endpoint_to_router(
            router,
            client,
            call_name,
            description=rpcs[call_name].get("description"),
            params_schema=rpcs[call_name].get("params_schema"),
        )

    for call_name in periodic_streams:
        stream_metadata[call_name] = PeriodicStreamMetadata(
            name=call_name,
            route=f"/api/{call_name}",
            params_schema=periodic_streams[call_name].get("params_schema"),
            return_schema=periodic_streams[call_name].get("return_schema"),
            description=periodic_streams[call_name].get("description"),
            encoding=periodic_streams[call_name].get("encoding"),
        )

    for call_name in manual_streams:
        stream_metadata[call_name] = ManualStreamMetadata(
            name=call_name,
            route=f"/api/{call_name}",
            params_schema=manual_streams[call_name].get("params_schema"),
            return_schema=manual_streams[call_name].get("return_schema"),
            description=manual_streams[call_name].get("description"),
            encoding=manual_streams[call_name].get("encoding"),
            frequency_hz=manual_streams[call_name].get("frequency_hz"),
            enabled=manual_streams[call_name].get("enabled"),
        )

    # Add metadata endpoints
    @router.get("/metadata/rpcs", tags=["Metadata"])
    def get_rpcs_metadata() -> dict[str, RPCMetadata]:
        """Get metadata for all RPCs."""
        return rpc_metadata

    @router.get("/metadata/streams", tags=["Metadata"])
    def get_streams_metadata() -> dict[str, StreamMetadata]:
        """Get metadata for all streams."""
        return stream_metadata

    return router


def _add_rpc_endpoint_to_router(
    router: APIRouter,
    client: RouterClient,
    call_name: str,
    description: str | None = None,
    params_schema: dict[str, Any] | None = None,
):
    """
    Create FastAPI endpoint that triggers one-liner RouterClient call (given by call_name).

    NOTE: all endpoints are registered as POST because the RouterServer doesn't provide information
    about whether a given call_name is read-only (GET) or has side effects (POST). Therefore, we
    default to POST for all endpoints.
    """

    def create_rpc_handler(call_name: str = call_name) -> Any:
        async def handler(kwargs: dict[str, Any] | None = None):
            try:
                return client.call_by_name(call_name, kwargs=kwargs)[1]  # omit timestamp
            except Exception as e:
                raise HTTPException(status_code=400, detail=str(e))

        return handler

    openapi_extra: dict[str, Any] | None = None
    if params_schema:
        # jsonref is used to remove any $ref references in the schema
        # OpenAPI uses a global $ref reference shared by all endpoints. Parameter schemas have $ref
        # references for individual RPCs meaning there's no guarantee that the $ref references are
        # unique across all RPCs, therefore we remove them.
        params_schema = jsonref.replace_refs(params_schema).get("properties", {})
        openapi_extra = {
            "requestBody": {
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": params_schema,
                        },
                    },
                },
            },
        }


    router.add_api_route(
        f"/{call_name}",
        create_rpc_handler(call_name),
        methods=["POST"],
        name=call_name,
        description=description,
        openapi_extra=openapi_extra,
    )
