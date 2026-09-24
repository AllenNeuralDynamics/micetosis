import type { useRPCAction, useRPCData } from '@/lib/one-liner-router';
import type { useChannel, useStream } from '@/lib/webrtc/call-streams';

/**
 * NOTE: why have resources instead of simply passing the raw hook returns to the view:
 *  - If hook implementation changes, the resource abstraction shields the view from breaking changes.
 *  - Simplifies testing: resources can be easily mocked or stubbed in tests.
 */

// Derived from one-liner & webrtc hook returns so shapes cannot drift.
type ActionReturn<TResult, TParams> = ReturnType<typeof useRPCAction<TResult, TParams>>;
type DataReturn<TResult> = ReturnType<typeof useRPCData<TResult, unknown>>;
type ChannelReturn<T> = ReturnType<typeof useChannel<T>>;
type StreamReturn = ReturnType<typeof useStream>;

// --------------------------------------------------------------------------------
//  Resource types
// --------------------------------------------------------------------------------

// For RPC actions (fired on user event).
export type ActionResource<TResult, TParams> = {
  call: (params: TParams) => void;
  callAsync: (params: TParams) => Promise<TResult>;
  result: TResult | undefined;
  isLoading: boolean;
  error: Error | null;
};

// For RPC data (fetched on mount, updated over time).
export type DataResource<TResult> = {
  data: TResult | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

// For bidirectional data channels (subscribe + send).
export type ChannelResource<T> = {
  data: T | null;
  send: (payload: unknown) => boolean;
  isOpen: boolean;
};

// For media streams. Bound to a <video> via ref callback.
export type StreamResource = {
  ref: (element: HTMLVideoElement | null) => void;
};

// --------------------------------------------------------------------------------
//  Resource conversion functions (from one-liner & webrtc hook returns)
// --------------------------------------------------------------------------------

export const toActionResource = <R, P>(a: ActionReturn<R, P>): ActionResource<R, P> => ({
  call: a.call,
  callAsync: a.callAsync,
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

export const toChannelResource = <T>(c: ChannelReturn<T>): ChannelResource<T> => ({
  data: c.data,
  send: c.send,
  isOpen: c.isOpen,
});

export const toStreamResource = (s: StreamReturn): StreamResource => ({
  ref: s,
});
