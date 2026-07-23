import addFormats from 'ajv-formats';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020';
import type { RPCMetadata } from './registry.ts';

// --------------------------------------------------------------------------------
//  Constants
// --------------------------------------------------------------------------------

// Pydantic v2 emits JSON Schema Draft 2020-12; use the matching Ajv build.
const ajv = new Ajv2020({ allErrors: true, strict: 'log' });
addFormats(ajv);
const validators = new Map<string, ValidateFunction>();

// --------------------------------------------------------------------------------
//  Errors
// --------------------------------------------------------------------------------

// Custom RPC error for invalid parameters
export class RPCParamsError extends Error {
  constructor(rpcName: string, details: string) {
    super(`Invalid params for "${rpcName}": ${details}`);
    this.name = 'RPCParamsError';
  }
}

// --------------------------------------------------------------------------------
//  Validation Function
// --------------------------------------------------------------------------------

/**
 * Validate if the given params match the schema for the RPC.
 * Throws an RPCParamsError if the params are invalid.
 * @param rpcName - The name of the RPC.
 * @param params - The parameters to validate.
 * @param paramsSchema - The JSON schema for the RPC parameters.
 * @returns void
 */
export function assertParamsValid(
  rpcName: string,
  params: unknown,
  paramsSchema: RPCMetadata['params_schema'],
): void {
  // Ignore if no schema is provided (no validation needed)
  if (!paramsSchema) return;
  let validate = validators.get(rpcName);
  if (!validate) {
    validate = ajv.compile(paramsSchema);
    validators.set(rpcName, validate);
  }
  if (validate(params)) return;
  const details = (validate.errors ?? [])
    .map((e) => `${e.instancePath || '(root)'} ${e.message ?? 'invalid'}`)
    .join('; ');
  throw new RPCParamsError(rpcName, details);
}
