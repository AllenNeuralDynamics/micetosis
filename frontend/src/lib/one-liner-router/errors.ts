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

// --------------------------------------------------------------------------------
//  Binding validation
// --------------------------------------------------------------------------------

/**
 * Errors thrown while checking expected widget bindings against backend metadata.
 * Issues are kept structured so the UI can render them; `message` is only for logs.
 */

export type BindingIssue =
  | { kind: 'unknown-rpc'; name: string }
  | { kind: 'unknown-stream'; name: string }
  | { kind: 'rpc-params-mismatch'; name: string; expected: unknown; actual: unknown }
  | { kind: 'rpc-results-mismatch'; name: string; expected: unknown; actual: unknown }
  | { kind: 'stream-results-mismatch'; name: string; expected: unknown; actual: unknown };

export function formatBindingIssues(issues: readonly BindingIssue[]): string {
  return issues
    .map((issue) => {
      switch (issue.kind) {
        case 'unknown-rpc':
          return `RPC "${issue.name}" is expected but not advertised by the backend.`;
        case 'unknown-stream':
          return `Stream "${issue.name}" is expected but not advertised by the backend.`;
        case 'rpc-params-mismatch':
          return (
            `RPC "${issue.name}" params schema mismatch:\n` +
            `  expected: ${JSON.stringify(issue.expected)}\n` +
            `  actual:   ${JSON.stringify(issue.actual)}`
          );
        case 'rpc-results-mismatch':
          return (
            `RPC "${issue.name}" results schema mismatch:\n` +
            `  expected: ${JSON.stringify(issue.expected)}\n` +
            `  actual:   ${JSON.stringify(issue.actual)}`
          );
        case 'stream-results-mismatch':
          return (
            `Stream "${issue.name}" results schema mismatch:\n` +
            `  expected: ${JSON.stringify(issue.expected)}\n` +
            `  actual:   ${JSON.stringify(issue.actual)}`
          );
      }
    })
    .join('\n');
}

export class BindingValidationError extends Error {
  readonly issues: readonly BindingIssue[];

  constructor(issues: readonly BindingIssue[]) {
    super(
      `Binding validation failed with ${issues.length} issue(s):\n${formatBindingIssues(issues)}`,
    );
    this.name = 'BindingValidationError';
    this.issues = issues;
  }
}
