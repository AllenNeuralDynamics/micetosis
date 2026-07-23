import { useRPCAction as useRPCActionBase, useRPCData as useRPCDataBase } from './call-rpc';
import type { RPCEndpoints, RPCName } from './generated/endpoints';

// Defining a type alias for the parameters argument.
// "object extends T" checks if empty object "{}" is "assignable" to the generic T type
// If it is, then all fields in a parameters map are optional, and we can make passing in the
// parameters argument optional. Otherwise, the parameters argument is required.
// EX. useRPCAction('zmq_function') <- if zmq_function has no required parameters
type ParamsArg<T> = object extends T ? [params?: T] : [params: T];

// ACTION hook
export function useRPCAction<K extends RPCName>(name: K) {
  const base = useRPCActionBase<RPCEndpoints[K]['result'], RPCEndpoints[K]['params']>(name);
  type P = RPCEndpoints[K]['params'];
  // ...rest is a tuple of either 0 or 1 element.
  // This was done because params may be both optional OR required based on the endpoint
  return {
    ...base,
    call: (...rest: ParamsArg<P>) => base.call((rest[0] ?? {}) as P),
    callAsync: (...rest: ParamsArg<P>) => base.callAsync((rest[0] ?? {}) as P),
  };
}

// DATA hook
export function useRPCData<K extends RPCName>(
  name: K,
  ...rest: ParamsArg<RPCEndpoints[K]['params']>
) {
  type P = RPCEndpoints[K]['params'];
  // ...rest is a tuple of either 0 or 1 element.
  // This was done because params may be both optional OR required based on the endpoint
  return useRPCDataBase<RPCEndpoints[K]['result'], P>(name, (rest[0] ?? {}) as P);
}
