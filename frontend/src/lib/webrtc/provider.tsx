import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ChannelInit, MediaSpec } from './types';
import { WebRTCClient } from './client';

// --------------------------------------------------------------------------------
// Contexts
// --------------------------------------------------------------------------------

/**
 * There are two primary contexts to interact with the WebRTC connection
 * - TransportContext: Provides stable API for interacting with the WebRTC connections.
 * - StatusContext: Provides the current connection status and live streams.
 */

type Subscriber = (data: unknown) => void;

interface TransportApi {
  subscribe: (label: string, fn: Subscriber) => () => void;
  send: (label: string, data: unknown) => boolean;
  getStream: (name: string) => MediaStream | null;
  bindVideo: (name: string, element: HTMLVideoElement) => () => void;
}

interface ConnectionStatus {
  connectionState: RTCPeerConnectionState;
  openChannels: string[];
  liveStreams: string[]; // Stream names with at least one track received
  error: Error | null;
}

const TransportContext = createContext<TransportApi | null>(null);
const StatusContext = createContext<ConnectionStatus | null>(null);

// --------------------------------------------------------------------------------
// Hooks
// --------------------------------------------------------------------------------

// Hook to access the current connection status of the WebRTC connection.
export function useConnectionStatus(): ConnectionStatus {
  const status = useContext(StatusContext);
  if (!status) {
    throw new Error('useConnectionStatus must be used inside a <WebRTCProvider>');
  }
  return status;
}

// Hook to access the transport API for interacting with the WebRTC connection.
export function useTransport(): TransportApi {
  const transport = useContext(TransportContext);
  if (!transport) {
    throw new Error('useTransport must be used inside a <WebRTCProvider>');
  }
  return transport;
}

// --------------------------------------------------------------------------------
// Provider
// --------------------------------------------------------------------------------

export interface WebRTCProviderProps {
  signalingUrl: string;
  channels?: ChannelInit[];
  media?: MediaSpec;
  iceServers?: RTCIceServer[];
  enabled?: boolean;
  children: React.ReactNode;
}

/**
 * WebRTCProvider sets up and manages a WebRTC connection.
 * It also sets up the transport API and provides the current connection status to its children.
 *
 * @param signalingUrl The URL of the signaling server used for establishing WebRTC connections.
 * @param channels The list of channels to initialize for the WebRTC connection.
 * @param media The media specifications for the WebRTC connection.
 * @param iceServers The ICE servers configuration for the WebRTC connection.
 * @param enabled Whether the WebRTC connection should be enabled.
 * @param children The child components that will have access to the WebRTC context.
 * @returns A React component that provides the Transport API and connection status context to its children.
 */
export function WebRTCProvider({
  signalingUrl,
  channels,
  media,
  iceServers,
  enabled = true,
  children,
}: WebRTCProviderProps) {
  const [status, setStatus] = useState<ConnectionStatus>({
    connectionState: 'new',
    openChannels: [],
    liveStreams: [],
    error: null,
  });

  // Client, subscribers, & videoElements references for managing WebRTC connections.
  // Critical these are references to ensure the same instances are used throughout the component's lifecycle.
  const clientRef = useRef<WebRTCClient | null>(null);
  const subscribers = useRef(new Map<string, Set<Subscriber>>());
  const videoElements = useRef(new Map<string, Set<HTMLVideoElement>>());

  // list of channels and list of media for the WebRTC client configuration.
  const configKey = useMemo(
    () => JSON.stringify({ channels: channels ?? [], media: media ?? [] }),
    [channels, media],
  );

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController(); // Manages the lifecycle of the WebRTC connection.
    const config = JSON.parse(configKey) as { channels: ChannelInit[]; media: MediaSpec[] };

    // Initialize the WebRTC client with the parsed configuration and event handlers.
    const client = new WebRTCClient({
      signalingUrl,
      channels: config.channels,
      media: config.media,
      iceServers,
      // Run callback functions for each subscriber (label => callback functions)
      onMessage: (label, data) => {
        const listeners = subscribers.current.get(label);
        if (!listeners) return;
        [...listeners].forEach((fn) => fn(data));
      },
      // Attach incoming media tracks to the corresponding video elements.
      onTrack: (name, _track, stream) => {
        videoElements.current.get(name)?.forEach((el) => {
          el.srcObject = stream;
        });
      },
      // Update the connection state in the component's status.
      onConnectionStateChange: (connectionState) => {
        setStatus((prev) => ({ ...prev, connectionState }));
      },
      // Update the list of open channels when a new channel is opened.
      onChannelOpen: (label) => {
        setStatus((prev) => ({ ...prev, openChannels: [...prev.openChannels, label] }));
      },
      // Update the list of open channels when a channel is closed.
      onChannelClose: (label) => {
        setStatus((prev) => ({
          ...prev,
          openChannels: prev.openChannels.filter((ch) => ch !== label),
        }));
      },
      // Update the error state in the component's status.
      onError: (error) => {
        setStatus((prev) => ({ ...prev, error }));
      },
    });

    clientRef.current = client;

    // Initial status of the WebRTC connection.
    setStatus({
      connectionState: 'new',
      openChannels: [],
      liveStreams: [],
      error: null,
    });

    // Connect the WebRTC client using the AbortController's signal.
    client.connect(controller.signal).catch((error) => {
      if (controller.signal.aborted) return;
      setStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error(String(error)),
      }));
    });

    // Cleanup function to abort the connection and reset the status when the component is unmounted or dependencies change.
    return () => {
      controller.abort();
      client.close();
      clientRef.current = null;
      setStatus({
        connectionState: 'closed',
        openChannels: [],
        liveStreams: [],
        error: null,
      });
    };
  }, [signalingUrl, configKey, iceServers, enabled]);

  // Define the transport API that will be provided to the rest of the application.
  const transport = useMemo<TransportApi>(
    () => ({
      // Subscribe to messages on a specific channel.
      subscribe: (label, fn) => {
        let listeners = subscribers.current.get(label);
        if (!listeners) {
          listeners = new Set();
          subscribers.current.set(label, listeners);
        }
        listeners.add(fn);

        return () => {
          listeners.delete(fn);
          if (listeners.size === 0) subscribers.current.delete(label);
        };
      },
      // Send a message on a specific channel.
      send: (label, data) => clientRef.current?.send(label, data) ?? false,

      // Get the media stream associated with a specific name.
      getStream: (name) => clientRef.current?.getStream(name) ?? null,

      // Bind a video element to a specific media stream.
      bindVideo: (name, element) => {
        let elements = videoElements.current.get(name);
        if (!elements) {
          elements = new Set();
          videoElements.current.set(name, elements);
        }
        elements.add(element);

        return () => {
          elements.delete(element);
          if (elements.size === 0) videoElements.current.delete(name);
        };
      },
    }),
    [],
  );

  // Render the context providers with the transport and status values.
  return (
    <TransportContext.Provider value={transport}>
      <StatusContext.Provider value={status}>{children}</StatusContext.Provider>
    </TransportContext.Provider>
  );
}
