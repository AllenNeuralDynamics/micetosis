import { useMutation, useQuery } from '@tanstack/react-query';
import type { RPCMetadata } from './registry.ts';
import { useRPCsMetadata } from './registry.ts';
import { assertParamsValid } from './validation.ts';

// --------------------------------------------------------------------------------
//  Errors
// --------------------------------------------------------------------------------

// Thrown when the requested RPC name is not present in the registry metadata.
export class RPCNotFoundError extends Error {
  constructor(rpcName: string) {
    super(`RPC function "${rpcName}" not found`);
    this.name = 'RPCNotFoundError';
  }
}

// Base class for any generic fetching failure when calling an RPC endpoint. Not thrown directly
export class RPCFetchError extends Error {
  constructor(rpcName: string, message: string, cause?: unknown) {
    super(`RPC "${rpcName}" failed: ${message}`);
    this.name = 'RPCFetchError';
    if (cause !== undefined) (this as Error & { cause?: unknown }).cause = cause;
  }
}

// Thrown when the request cannot reach the backend at all (network error)
export class RPCNetworkError extends RPCFetchError {
  constructor(rpcName: string, cause: unknown) {
    super(rpcName, 'could not reach backend', cause);
    this.name = 'RPCNetworkError';
  }
}

// Thrown when the backend responded with a non-2xx status.
export class RPCHttpError extends RPCFetchError {
  readonly status: number;
  readonly body: string;
  constructor(rpcName: string, status: number, body: string) {
    super(rpcName, `HTTP ${status}: ${body}`);
    this.name = 'RPCHttpError';
    this.status = status;
    this.body = body;
  }
}

// --------------------------------------------------------------------------------
//  API
// --------------------------------------------------------------------------------

/**
 * Call FastAPI endpoint that forwards and calls the corresponding ZMQ RPC.
 * @param name - The name of the RPC function (from one-liner), this is for error messages only.
 * @param route - The route to call the RPC function, from the registry metadata.
 * @param params - The parameters to pass to the RPC function.
 * @returns The result of the RPC call.
 */
async function callRPC(name: string, route: string, params: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch (cause) {
    // Network Error
    throw new RPCNetworkError(name, cause);
  }
  // HTTP Error
  if (!res.ok) throw new RPCHttpError(name, res.status, await res.text());
  return res.json();
}

// --------------------------------------------------------------------------------
//  Helper Function for Hook calls
// --------------------------------------------------------------------------------

/**
 * Builds a callback function for calling an RPC. Before calling it will perform the following checks:
 *  - Check if the RPC exists in the registry metadata. (RPCNotFoundError if not found)
 *  - Check if the params match the RPC's params_schema. (RPCParamsError if invalid)
 *  - Call the RPC endpoint and return the result. (RPCFetchError if HTTP call fails)
 * @param metadata - The RPCMetadata for the RPC, or undefined if not found.
 * @param name - The name of the RPC.
 * @returns A function that takes params and returns a Promise of the RPC result.
 */
function buildRPCCallback(metadata: RPCMetadata | undefined, name: string) {
  return (params: unknown) => {
    // Check if zmq function exists
    if (!metadata) throw new RPCNotFoundError(name);

    // Assert params data is valid against param schema
    assertParamsValid(name, params ?? {}, metadata.params_schema);

    // Function to fetch data from the RPC endpoint
    return callRPC(name, metadata.route, params);
  };
}

// --------------------------------------------------------------------------------
//  Hook
// --------------------------------------------------------------------------------

// ACTION hook: Wraps a mutation for user-triggered calls (forms, buttons)
export const useRPCAction = <TResult = unknown, TParams = void>(name: string) => {
  const rpcMetadata = useRPCsMetadata().data?.[name];
  const runRPC = buildRPCCallback(rpcMetadata, name);

  const mutation = useMutation<TResult, Error, TParams>({
    mutationFn: (params) => runRPC(params) as Promise<TResult>,
  });

  return {
    metadata: rpcMetadata,
    // triggers
    call: mutation.mutate,
    callAsync: mutation.mutateAsync,
    // output fields
    result: mutation.data,
    error: mutation.error,
    isLoading: mutation.isPending,
    reset: mutation.reset,
  };
};

// DATA hook: loads on mount for display (charts, panels). Wraps a query.
export const useRPCData = <TResult = unknown, TParams = unknown>(name: string, params: TParams) => {
  const rpcMetadata = useRPCsMetadata().data?.[name];
  const runRPC = buildRPCCallback(rpcMetadata, name);

  const query = useQuery<TResult>({
    queryKey: ['rpc-call', name, params],
    queryFn: () => runRPC(params) as Promise<TResult>,
    enabled: !!rpcMetadata, // wait for registry; guards missing route
  });

  return {
    metadata: rpcMetadata,
    // trigger
    refetch: query.refetch,
    // output fields
    result: query.data,
    error: query.error,
    isLoading: query.isLoading,
  };
};
