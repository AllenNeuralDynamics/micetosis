import { useCallback, useEffect, useRef, useState } from 'react';
import { useConnectionStatus, useTransport } from './provider';

export interface UseChannelOptions {
  throttleMs?: number; // Throttle interval in milliseconds for batching updates.
  history?: number; // Maximum number of historical messages to keep.
}

export interface UseChannelResult<T> {
  data: T | null;
  history: T[];
  send: (data: unknown) => boolean;
  isOpen: boolean;
  count: number;
}

/**
 * Subscribes to a named RTCDataChannel and provides access to its data, history, and status.
 * @param label The label of the RTCDataChannel to subscribe to.
 * @param options Configuration options for the channel subscription. (see UseChannelOptions)
 * @returns An object containing the channel's data, history, send function, open status, and message count.
 */
export function useChannel<T = unknown>(
  label: string,
  options: UseChannelOptions = {},
): UseChannelResult<T> {
  const { throttleMs = 0, history: historyLimit = 0 } = options;

  // Get the transport and connection context
  const transport = useTransport();
  const status = useConnectionStatus();

  const [data, setData] = useState<T | null>(null);
  const [history, setHistory] = useState<T[]>([]);
  const [count, setCount] = useState(0);

  // These refs are for storing pending updates in throttled mode without triggering re-renders.
  const pendingLatest = useRef<T | null>(null);
  const pendingHistory = useRef<T[]>([]);
  const pendingCount = useRef(0);
  const hasPending = useRef(false);

  // Effect for subscribing to the channel and handling incoming messages.
  // Ran whenever the label, throttle interval, history limit, or transport changes.
  useEffect(() => {
    // Subscribe to the channel and handle incoming messages.
    const unsubscribe = transport.subscribe(label, (raw) => {
      const value = raw as T;

      // If throttling is enabled, store the incoming value in the pending refs and exit early.
      if (throttleMs > 0) {
        pendingLatest.current = value;
        pendingCount.current += 1;
        // Buffered separately so throttling batches renders without discarding any messages.
        if (historyLimit > 0) pendingHistory.current.push(value);
        hasPending.current = true;
        return;
      }

      // If not throttling, update the state immediately with the incoming value.
      setData(value);
      setCount((c) => c + 1);
      if (historyLimit > 0) setHistory((prev) => [...prev, value].slice(-historyLimit));
    });

    return unsubscribe;
  }, [label, throttleMs, historyLimit, transport]);

  // Effect for handling throttled updates to the channel's state.
  useEffect(() => {
    // Skip this effect entirely if throttling is not enabled.
    if (throttleMs <= 0) return;

    const timer = setInterval(() => {
      // Skip the render entirely when nothing arrived, so an idle channel costs
      // nothing rather than re-rendering on every tick.
      if (!hasPending.current) return;
      hasPending.current = false;

      setData(pendingLatest.current);
      setCount((c) => c + pendingCount.current);
      pendingCount.current = 0;

      if (historyLimit > 0 && pendingHistory.current.length > 0) {
        const batch = pendingHistory.current;
        pendingHistory.current = [];
        setHistory((prev) => [...prev, ...batch].slice(-historyLimit));
      }
    }, throttleMs);

    return () => clearInterval(timer);
  }, [throttleMs, historyLimit]);

  const send = useCallback(
    (payload: unknown) => transport.send(label, payload),
    [transport, label],
  );

  return {
    data,
    history,
    send,
    isOpen: status.openChannels.includes(label),
    count,
  };
}

/**
 * Returns a callback ref that binds the specified video stream to a video element.
 * @param name The name of the video stream to bind to the video element.
 * @returns A callback ref function to be assigned to the `ref` attribute of a video element.
 */
export function useStream(name: string): (element: HTMLVideoElement | null) => void {
  // Get the transport context for managing video streams.
  const transport = useTransport();

  // Holds the unbind function between the mount and unmount calls of the ref.
  const unbindRef = useRef<(() => void) | null>(null);

  return useCallback(
    (element: HTMLVideoElement | null) => {
      // React calls the ref with null on unmount, and again with null before
      // rebinding. Either way, release the previous registration first.
      unbindRef.current?.();
      unbindRef.current = null;

      if (!element) return;

      unbindRef.current = transport.bindVideo(name, element);

      const stream = transport.getStream(name);
      if (stream) element.srcObject = stream;
    },
    [transport, name],
  );
}
