// --------------------------------------------------------------------------------
//  Base
// --------------------------------------------------------------------------------

// Base class for any generic RPC failure
export class RPCError extends Error {
  constructor(rpcName: string, message: string, cause?: unknown) {
    super(`RPC "${rpcName}" failed: ${message}`);
    this.name = 'RPCError';
    if (cause !== undefined) (this as Error & { cause?: unknown }).cause = cause;
  }
}

// --------------------------------------------------------------------------------
//  Errors
// --------------------------------------------------------------------------------

// Thrown when the parameters provided to an RPC call does not match expected schema for that RPC
// Schemas for the RPCs are defined in the metadata and validated using Ajv
export class RPCParamsError extends RPCError {
  constructor(rpcName: string, details: string) {
    super(rpcName, `Invalid params for "${rpcName}": ${details}`);
    this.name = 'RPCParamsError';
  }
}

// Thrown when the request can't reach the backend
export class RPCNetworkError extends RPCError {
  constructor(rpcName: string, cause: unknown) {
    super(rpcName, 'could not reach backend', cause);
    this.name = 'RPCNetworkError';
  }
}

// Thrown when the backend responded with a non-2xx status.
export class RPCHttpError extends RPCError {
  readonly status: number;
  readonly body: string;
  constructor(rpcName: string, status: number, body: string) {
    super(rpcName, `HTTP ${status}: ${body}`);
    this.name = 'RPCHttpError';
    this.status = status;
    this.body = body;
  }
}

// Thrown when the requested RPC name is not present in the RPC metadata registry
// Thrown also when the route is missing (400 error)
export class RPCNotFoundError extends RPCHttpError {
  constructor(rpcName: string) {
    super(rpcName, 404, `RPC function "${rpcName}" not found in metadata list`);
    this.name = 'RPCNotFoundError';
  }
}
