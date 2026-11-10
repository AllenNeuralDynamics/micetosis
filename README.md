# Instrument UI Template

A starter template for building a **web UI** that seamlessly connects to a separate instrument software provisioned with [`one-liner`](https://github.com/AllenNeuralDynamics/one-liner). 

The template gives you:

- A **FastAPI service** that spins up a `one-liner` `RouterClient` which connects to the instruments `one-liner` `RouterServer`; auto-discovers every RPC and stream exposed by the instrument, and turns them into typed HTTP endpoints for the webapp to interact with. 
- A **React + TypeScript webapp** (Vite + Mantine + TanStack Router/Query + Tailwind) which utilizes a custom `widget` pattern that handles loading data from RPCs and streams.  
- A **single `config.json`** to define what RPCs and streams to connect to what widgets. 

## Table of contents

- [Instrument UI Template](#instrument-ui-template)
  - [Table of contents](#table-of-contents)
  - [Architecture](#architecture)
    - [Instrument](#instrument)
    - [Webapp - backend](#webapp---backend)
    - [Webapp - frontend](#webapp---frontend)
  - [Prerequisites](#prerequisites)
  - [Quick start](#quick-start)
  - [Configuration](#configuration)
  - [Repository layout](#repository-layout)
  - [Adapting the template](#adapting-the-template)
  - [Tooling](#tooling)
  - [Roadmap / known gaps](#roadmap--known-gaps)

## Architecture

### Instrument

This is a software with `one-liner` that exposes a `RouterServer`. The `RouterServer` is what handles exposing data & functions from the instrument server. This template provides an example server, remove before developing. 

### Webapp - backend

The backend is a fastAPI service that creates a `one-liner` `RouterClient` which connects to the `RouterServer` on the instrument. Connection details for the `RouterServer` can be defined in the `config.json`.

The backend provides the following information to the webapp 

- metadata about the RPCs/streams on the `RouterServer`.
- `offer` endpoint to help establish webrtc connection between backend and frontend.
- provides endpoints for each RPC with the function signature passed to the openapi spec.

### Webapp - frontend

The frontend has a single `config.json` where users can define widget instances.

Widget Instance Example: 

```json
"<instance_name>": {  
  "type": "<instance_type>"
  "bindings": {
    "<slot_1_name>": "<zmq_binding_1>"
    "<slot_2_name>": "<zmq_binding_2>"
  }
}
```

- Instance name: unique identifier for this widget
- Widget type: type of widget. There is a registry defined in `frontend/src/widgets/index.ts` with a list of widget types. Each widget type has two main components:
  - `view.tsx` which is a react UI component
  - `contract.tsx` a definition of what slots the `view` needs to run
- Bindings: a map of widget **slots** to the corresponding `one-liner` **call_name** or **zmq_binding**.

Additional detail about the widget pattern can be found in the [widget.md](widget.md)

## Prerequisites

- **Python** ≥ 3.12 with [uv](https://docs.astral.sh/uv/) installed.
- **Node.js** ≥ 20 with npm.
- An instrument process running a `one-liner` `RouterServer` reachable over ZMQ (defaults: `tcp://localhost:5555` for RPC, `tcp://localhost:5556` for broadcasts).


## Quick start

**1. Start the instrument's `RouterServer`** (out of scope — this is your instrument software).

**2. Configure** — edit [config.json](config.json) at the repo root (see [Configuration](#configuration)).

**3. Start Backend:**

```powershell
cd backend
uv sync
uv run python -m web_ui_backend.main
```

The backend listens on `http://localhost:8000`. Health check: `GET /`. OpenAPI docs: `http://localhost:8000/docs`.

Optional flags:

```powershell
uv run python -m web_ui_backend.main --config path\to\config.json --log-level DEBUG
```

**4. Start Frontend:**

```powershell
cd frontend
npm install
npm run dev
```

`npm run dev` runs a `predev` step that:

1. Waits for the backend's `/api/metadata/rpcs` endpoint to come up.
2. Generates TypeScript types + an endpoint registry from that live schema (see [Code generation](#code-generation-rpc--typescript)).

The dev server then starts on `http://localhost:5173` and proxies `/api/*` to the backend.

## Configuration

The single source of truth is [config.json](config.json) at the repo root:

```json
{
  "title": "Example App Title",
  "server": {
    "url": "http://127.0.0.1",
    "port": 8000,
    "rpcs_endpoint": "/api/metadata/rpcs",
    "streams_endpoint": "/api/metadata/streams",
    "offer_endpoint": "/api/offer"
  },
}
```

## Repository layout

```
.
├── config.json                       # Shared runtime config (backend + frontend)
├── backend/                          # FastAPI service (uv-managed)
│   ├── pyproject.toml
│   └── src/web_ui_backend/
│       ├── main.py                   # CLI entrypoint (uvicorn runner)
│       ├── app.py                    # FastAPI run entrypoint (debugging)
│       ├── app_factory.py            # create_app(config) — wires middleware + routers
│       ├── router_factory.py         # Maps RouterClient RPCs into FastAPI routes
│       ├── webrtc.py                 # WebRTC offer handling / stream transport
│       ├── config.py                 # Config schema + load_config()
│       └── metadata_model.py         # RPCMetadata / StreamMetadata schemas
└── frontend/                         # Vite + React + TS
    ├── index.html
    └── src/
        ├── app/                      # Root providers, router, file-based routes
        │   └── routes/               # Where page routes are created
        ├── components/               # Reusable UI components
        ├── hooks/
        │   └── use-config.ts         # Reads /api/config
        ├── lib/
        │   ├── one-liner-router/     # One-liner related hooks & functions
        │   └── webrtc/               # WebRTC client + stream provider
        └── widgets/
            ├── index.ts              # Widget type registry
            ├── framework/            # Widget main engine 
            └── MiceCloningFacility/  # Example widget
                ├── contract.ts
                ├── view.tsx
                └── index.ts
```

The project loosely follows the [bulletproof-react](https://github.com/alan2207/bulletproof-react) structure (`app/`, `features/`, `components/`, `hooks/`, `lib/`).

## Adapting the template

1. **Point at your instrument**: Update `config.json` to point at the new `RouterServer`

2. **Widgets**: Replace and create your own widgets ([widgets.md](widgets.md) has details on how to do this).

3. **Routes**: Replace and create your own route 

4. **Rename the Python package.** `web_ui_backend` is generic — rename to something instrument-specific if you plan to publish (cookiecutter support is on the [roadmap](#roadmap--known-gaps)).

## Tooling

| Tool              | Purpose           | Command                                   |
| ----------------- | ----------------- | ----------------------------------------- |
| `uv`              | Python env + deps | `uv sync`, `uv add <pkg>`, `uv run <cmd>` |
| `ruff`            | Python lint       | `uv run ruff check`                       |
| `mypy`            | Python typecheck  | `uv run mypy`                             |
| `pytest`          | Python tests      | `uv run pytest`                           |
| `oxlint`          | JS/TS lint (fast) | `npm run lint` / `npm run lint:fix`       |
| `prettier`        | JS/TS format      | `npm run format` / `npm run format:check` |
| `tsc -b --noEmit` | TS typecheck      | `npm run typecheck`                       |
| `vite build`      | Production bundle | `npm run build`                           |

## Roadmap / known gaps

Nice-to-haves that are **not** wired up yet:

- **Static-file serving in production.** `main.py` has a stubbed `serve_static_frontend(app)` — needs a proper build-and-embed step (and to be renamed away from `prototome_web_ui`).
- **Testing.** No test scaffolding yet — plan is Vitest + React Testing Library + MSW for the frontend, pytest for the backend.
- **CI.** No workflow files yet.
- **Cookiecutter.** For scaffolding a fresh instrument UI without hand-renaming `web_ui_backend`.
- **RPC HTTP verbs.** Every RPC is `POST`. If `RouterServer` ever reports read-only RPCs, wire that through `router_factory.py`.