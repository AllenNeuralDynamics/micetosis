// Public API for the one-liner-router hooks.
// Consumers should import from '@/lib/one-liner-router'

// Metadata Types
export type { RPCMetadata, RPCsMetadata, StreamMetadata, StreamsMetadata } from './metadata';

// Metadata Hooks
export { useRPCsMetadata, useStreamsMetadata } from './metadata';

// RPC Hooks (facade) — these are what consumers use.
export { useRPCAction, useRPCData } from './call-rpc';

// Resource types + hook-return → resource helpers.
export { toActionResource, toDataResource } from './resources';
export type { ActionResource, DataResource } from './resources';

// Errors (still from call-rpc; just don't re-export the raw hooks)
export { RPCHttpError, RPCNetworkError, RPCNotFoundError, RPCParamsError } from './errors';
