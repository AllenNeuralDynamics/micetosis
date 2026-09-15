import type { useRPCAction, useRPCData } from './call-rpc';

// Derived from the hook return so the two shapes cannot drift.
type ActionReturn<TResult, TParams> = ReturnType<typeof useRPCAction<TResult, TParams>>;
type DataReturn<TResult> = ReturnType<typeof useRPCData<TResult, unknown>>;

// For RPC actions (fired on user event).
export type ActionResource<TResult, TParams> = {
  call: (params: TParams) => void;
  result: TResult | undefined;
  isLoading: boolean;
  error: Error | null;
};

// For RPC data / streams (fetched on mount, updated over time).
export type DataResource<TResult> = {
  data: TResult | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

export const toActionResource = <R, P>(a: ActionReturn<R, P>): ActionResource<R, P> => ({
  call: a.call,
  result: a.result,
  isLoading: a.isLoading,
  error: a.error,
});

export const toDataResource = <R>(d: DataReturn<R>): DataResource<R> => ({
  data: d.result,
  isLoading: d.isLoading,
  error: d.error,
  refetch: d.refetch,
});
