# Backend — `web_ui_backend`

FastAPI + Pydantic v2 + [`one-liner`](https://github.com/AllenNeuralDynamics/one-liner) service that fronts an instrument's `RouterServer`. It connects a `RouterClient` at startup, auto-discovers every RPC and stream, and turns them into typed HTTP endpoints (plus `/api/metadata/*` endpoints describing them).

For repo-wide context (architecture diagram, quick start across both apps, roadmap), see the [root README](../newREADME.md).

## Table of contents

- [Backend — `web_ui_backend`](#backend--web_ui_backend)
  - [Table of contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Install \& run](#install--run)
  - [Configuration](#configuration)
  - [Startup flow](#startup-flow)
  - [Endpoints](#endpoints)
  - [Parameter validation](#parameter-validation)
  - [Streams](#streams)

## Prerequisites

- **Python** ≥ 3.12 with [uv](https://docs.astral.sh/uv/) installed.
- An instrument process running a `one-liner` `RouterServer` reachable over ZMQ (defaults: `tcp://localhost:5555` for RPC, `tcp://localhost:5556` for broadcasts).

## Install & run

```powershell
cd backend
uv sync
uv run python -m web_ui_backend.main
```

The backend listens on `http://localhost:8000`.

- Health check: `GET /`
- OpenAPI docs: `http://localhost:8000/docs`

Optional flags:

```powershell
uv run python -m web_ui_backend.main --config path\to\config.json --log-level DEBUG
```

## Configuration

The single source of truth is [`config.json`](../config.json) at the repo root:

```json
{
  "ui": {
    "title": "Micetosis Template",
    "rpcs_endpoint": "/api/metadata/rpcs",
    "streams_endpoint": "/api/metadata/streams"
  },
  "server": {
    "url": "http://127.0.0.1",
    "port": "8000"
  }
}
```

- **`ui.*`** — forwarded to the browser via `GET /api/config`. Safe to expose (title, metadata endpoint paths, feature flags).
- **`server.*`** — server-only. Never exposed to the browser. Extend this section with instrument-specific settings (ZMQ ports, database URIs, secrets, etc.).

The backend loads and validates this file with Pydantic — see [src/web_ui_backend/config.py](src/web_ui_backend/config.py). Missing fields fall back to model defaults; a missing file logs a warning and uses all defaults.

To point the backend at a different file:

```powershell
uv run python -m web_ui_backend.main --config C:\path\to\other-config.json
```

## Startup flow

1. `main.py` parses args → `load_config(args.config)`.
2. `create_app(config)` builds the FastAPI app, adds CORS middleware, and registers `GET /` and `GET /api/config`.
3. A `RouterClient` is instantiated from `config.server.router_client`.
4. `create_zmq_router(client)` calls `client.get_rpc_configurations()` and `client.get_stream_configurations()`, then:
   - Registers one `POST /api/<rpc_name>` route per RPC.
   - Registers `GET /api/metadata/rpcs` and `GET /api/metadata/streams` returning schemas + descriptions.

## Endpoints

| Method | Path                    | Purpose                                                          |
| ------ | ----------------------- | ---------------------------------------------------------------- |
| GET    | `/`                     | Health check                                                     |
| GET    | `/api/config`           | UI-safe subset of `config.json` (the `ui.*` section)             |
| GET    | `/api/metadata/rpcs`    | Every RPC exposed by the instrument, with param + return schemas |
| GET    | `/api/metadata/streams` | Every stream (periodic + manual) exposed by the instrument       |
| POST   | `/api/<rpc_name>`       | One route per RPC — forwards `kwargs` to `client.call_by_name()` |

> **Note:** every RPC endpoint is registered as `POST` because `RouterServer` does not report read-only vs. side-effectful RPCs. If you need `GET` semantics for a specific RPC (e.g. for browser caching), add an override in [src/web_ui_backend/router_factory.py](src/web_ui_backend/router_factory.py).

## Parameter validation

`params_schema` from the instrument is threaded into each endpoint's OpenAPI `requestBody` (via `openapi_extra`) after `jsonref` resolves and flattens `$ref` entries — necessary because RPCs may reuse names across schemas.

## Streams

`/api/metadata/streams` reports periodic and manual streams. The template currently only exposes metadata; wiring streams up to a transport (WebSocket / WebRTC) is a next step — `aiortc` is already a dependency.