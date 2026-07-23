# Frontend

React 19 + TypeScript SPA (Vite + Mantine + TanStack Router/Query + Tailwind) with a code-generated, type-safe client for every backend RPC — no manual endpoint wiring.

For repo-wide context (architecture diagram, cross-app quick start, roadmap), see the [root README](../newREADME.md). For the original design-notes README, see [README.md](README.md).

## Table of contents

- [Frontend](#frontend)
  - [Table of contents](#table-of-contents)
  - [Prerequisites](#prerequisites)
  - [Install \& run](#install--run)
  - [Stack](#stack)
  - [Typed RPC hooks](#typed-rpc-hooks)
  - [Errors](#errors)
  - [Code generation: RPC → TypeScript](#code-generation-rpc--typescript)
  - [Routing \& navigation](#routing--navigation)

## Prerequisites

- **Node.js** ≥ 20 with npm.
- The backend running on `http://localhost:8000` (see [backend/README.md](../backend/README.md)). The dev server proxies `/api/*` to it and needs `/api/metadata/rpcs` up before code generation can succeed.

## Install & run

```powershell
cd frontend
npm install
npm run dev
```

`npm run dev` runs a `predev` step that:

1. Waits for the backend's `/api/metadata/rpcs` endpoint to come up.
2. Generates TypeScript types + an endpoint registry from that live schema (see [Code generation](#code-generation-rpc--typescript)).

The dev server then starts on `http://localhost:5173` and proxies `/api/*` to the backend.

Production build:

```powershell
npm run build
```

## Stack

| Concern               | Choice                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| Routing               | [TanStack Router](https://tanstack.com/router) (file-based, `src/app/routes/`)                             |
| Data fetching / cache | [TanStack Query v5](https://tanstack.com/query)                                                            |
| UI components         | [Mantine v9](https://mantine.dev)                                                                          |
| Layout / composition  | [Tailwind CSS v4](https://tailwindcss.com)                                                                 |
| State (client-only)   | [Zustand](https://zustand.demo.pmnd.rs)                                                                    |
| Schema validation     | [Ajv 2020](https://ajv.js.org) + `ajv-formats` for RPC params; [Zod](https://zod.dev) for app-level config |
| Path alias            | `@` → `frontend/src`                                                                                       |

**Styling convention:** Tailwind for layout/spacing; Mantine components for interactive UI and theming. Avoid mixing.

The project loosely follows the [bulletproof-react](https://github.com/alan2207/bulletproof-react) structure (`app/`, `features/`, `components/`, `hooks/`, `lib/`).

## Typed RPC hooks

Two hooks form the public API — see [src/hooks/one-liner-router/typed-hooks.ts](src/hooks/one-liner-router/typed-hooks.ts):

```ts
import { useRPCAction, useRPCData } from '@/hooks/one-liner-router';

// Mutation-style: fire-and-forget RPC call
const changeTune = useRPCAction('change_tune');
changeTune.call({ tune: 'greensleeves' });

// Query-style: RPCs treated as GETs, cached via React Query
const dancer = useRPCData('get_dancer', { name: 'Ada' });
```

The generic parameter is a **union of RPC names** (`RPCName`) known at compile time. Params and result types are looked up via `RPCEndpoints[K]['params']` / `['result']`.

Params are conditionally optional using a rest-tuple trick:

```ts
type ParamsArg<T> = object extends T ? [params?: T] : [params: T];
```

If every field on the params type is optional, you can call `useRPCData('get_dancer')` without arguments; otherwise the compiler forces you to pass them.

## Errors

[`call-rpc.ts`](src/hooks/one-liner-router/call-rpc.ts) defines a small taxonomy:

- `RPCNotFoundError` — RPC name not in the metadata registry.
- `RPCFetchError` — abstract base (never thrown directly).
  - `RPCNetworkError(rpcName, cause)` — `fetch` rejected.
  - `RPCHttpError(rpcName, status, body)` — non-2xx response.

Handle them in an error boundary or per-hook via `onError`.

## Code generation: RPC → TypeScript

Run automatically before `dev` and `build`; run manually with:

```powershell
npm run gen:rpc
```

Under the hood ([scripts/generate-rpc-types.mjs](scripts/generate-rpc-types.mjs)):

1. `GET http://localhost:8000/api/metadata/rpcs`.
2. For each RPC, run `json-schema-to-typescript` on `params_schema` and `return_schema` → one file per RPC in [src/hooks/one-liner-router/generated/](src/hooks/one-liner-router/generated/).
3. Emit a top-level `endpoints.ts` containing:
   - `RPCEndpoints` — `{ [rpcName]: { params, result } }`
   - `RPCName = keyof RPCEndpoints`
   - `ROUTES` — `{ [rpcName]: '/api/<rpcName>' }`

Everything under `generated/` is disposable; regenerate whenever the instrument's RPC surface changes.

> **Tip:** for well-typed results, annotate your Python RPC return types with concrete Pydantic models (not bare `dict`). The generator will otherwise emit `{ [k: string]: unknown }`.

## Routing & navigation

Routes are file-based under [src/app/routes/](src/app/routes/). They advertise themselves to the main layout's breadcrumb bar via `staticData`:

```ts
export const Route = createFileRoute('/example')({
  component: ExampleRoute,
  staticData: { label: 'Example' },
});
```

Any route with a `staticData.label` will appear in the header.