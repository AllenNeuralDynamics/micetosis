// Public API for the one-liner-router hooks.
// Consumers should import from '@/hooks/one-liner-router'

// Typed hooks (facade) — these are what consumers use.
export { useRPCAction, useRPCData } from './typed-hooks';

export { useRPCAction as useDynamicRPCAction, useRPCData as useDynamicRPCData } from './call-rpc';

// Errors (still from call-rpc; just don't re-export the raw hooks)
export { RPCFetchError, RPCHttpError, RPCNetworkError, RPCNotFoundError } from './call-rpc';

// Registry hooks + parameter validation error
export { useRPCsMetadata, useStreamsMetadata } from './registry';
export { RPCParamsError } from './validation';

// Metadata types
export type { RPCMetadata, RPCsMetadata, StreamMetadata, StreamsMetadata } from './registry';

// Generated endpoint types (handy if a consumer wants to name a param/result type)
export type { RPCEndpoints, RPCName } from './generated/endpoints';
