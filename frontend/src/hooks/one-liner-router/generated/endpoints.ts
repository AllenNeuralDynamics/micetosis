// AUTO-GENERATED from RPC metadata. Do not edit by hand.
import type { ChangeTuneParams, ChangeTuneResult } from './change_tune';
import type { GetDancerParams, GetDancerResult } from './get_dancer';
import type { NoAnnotationParams, NoAnnotationResult } from './no_annotation';

// Static map of RPC name -> { params, result }. The typed hook facade is
// generic over `keyof RPCEndpoints`, which is what turns `name: string`
// into an autocompleting union and binds params/result to the schema.
export interface RPCEndpoints {
  "change_tune": { params: ChangeTuneParams; result: ChangeTuneResult };
  "get_dancer": { params: GetDancerParams; result: GetDancerResult };
  "no_annotation": { params: NoAnnotationParams; result: NoAnnotationResult };
}

export type RPCName = keyof RPCEndpoints;

// Routes are also available statically if you ever need them off the hook path.
export const ROUTES = {
  "change_tune": "/api/change_tune",
  "get_dancer": "/api/get_dancer",
  "no_annotation": "/api/no_annotation",
} as const satisfies Record<RPCName, string>;
