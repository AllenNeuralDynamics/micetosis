import type { ChannelInit, ChannelSpec, MediaSpec, SignalingRequest } from './types';

export interface WebRTCClientOptions {
  signalingUrl: string;
  channels?: ChannelInit[];
  media?: MediaSpec[];
  localTracks?: MediaStreamTrack[];
  iceServers?: RTCIceServer[];
  iceGatheringTimeoutMs?: number;
  highWaterMark?: number;
  onMessage?: (label: string, data: unknown, event: MessageEvent) => void;
  onTrack?: (name: string, track: MediaStreamTrack, stream: MediaStream) => void;
  onChannelOpen?: (label: string, channel: RTCDataChannel) => void;
  onChannelClose?: (label: string) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onError?: (error: Error) => void;
}

const DEFAULTS = {
  iceGatheringTimeoutMs: 3000,
  highWaterMark: 256 * 1024,
};

// --------------------------------------------------------------------------------
//  Utility functions
// --------------------------------------------------------------------------------

/**
 * Decodes raw data that may be a JSON string, ArrayBuffer, or Blob.
 * @param raw The raw data to decode, which can be a string, ArrayBuffer, or Blob.
 * @returns The decoded data, or the original raw data if it cannot be parsed as JSON.
 */
function decode(raw: string | ArrayBuffer | Blob): unknown {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Converts a ChannelInit into a normalized ChannelSpec.
 * ChannelInit can be a string (just the channel label) or an object with more detailed channel specifications to tune behavior.
 * @param init The ChannelInit object to normalize.
 * @returns The normalized ChannelSpec object.
 */
function normalizeChannel(init: ChannelInit): ChannelSpec {
  const spec = typeof init === 'string' ? { label: init } : init;
  if (spec.maxRetransmits !== undefined && spec.maxPacketLifeTime !== undefined) {
    throw new Error(
      `channel "${spec.label}": maxRetransmits and maxPacketLifeTime are mutually exclusive`,
    );
  }
  return spec;
}

/**
 * ICE gathering utility function.
 * @param pc The RTCPeerConnection to wait for ICE gathering to complete on.
 * @param timeoutMs The maximum time to wait for ICE gathering to complete, in milliseconds.
 * @returns A promise that resolves once ICE gathering is complete or the timeout is reached.
 */
function waitForIceGathering(pc: RTCPeerConnection, timeoutMs: number): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === 'complete') finish();
    };
    const timer = setTimeout(finish, timeoutMs);
    pc.addEventListener('icegatheringstatechange', check);
    check();
  });
}

// --------------------------------------------------------------------------------
//  WebRTC Client
// --------------------------------------------------------------------------------

export class WebRTCClient {
  private pc: RTCPeerConnection | null = null;
  private readonly channels = new Map<string, RTCDataChannel>();
  private readonly streams = new Map<string, MediaStream>();
  private readonly midToName = new Map<string, string>();
  private readonly pendingOpen = new Map<string, Array<() => void>>();
  private readonly opts: Required<
    Pick<WebRTCClientOptions, 'iceGatheringTimeoutMs' | 'highWaterMark'>
  > &
    WebRTCClientOptions;

  constructor(options: WebRTCClientOptions) {
    this.opts = { ...DEFAULTS, ...options };
    const names = (options.media ?? []).map((m) => m.name);
    const duplicate = names.find((n, i) => names.indexOf(n) !== i);
    if (duplicate) {
      throw new Error(`duplicate media name "${duplicate}"; stream names must be unique`);
    }
  }

  get connectionState(): RTCPeerConnectionState {
    return this.pc?.connectionState ?? 'new';
  }

  get labels(): string[] {
    return Array.from(this.channels.keys());
  }

  get streamNames(): string[] {
    return Array.from(this.streams.keys());
  }

  getStream(name: string): MediaStream | null {
    return this.streams.get(name) ?? null;
  }

  /**
   * Primary method to establish a WebRTC connection.
   *
   * (Listeners) Establishes callbacks for connection state changes, data channels, and media tracks.
   * (Declarations) Tracks the channels and media streams associated with the connection.
   * (Connecting) Handles the creation of the offer and negotiation of the connection.
   *
   * @param signal AbortSignal to allow cancellation of the connection process.
   */
  async connect(signal?: AbortSignal): Promise<void> {
    if (this.pc) throw new Error('WebRTCClient is already connected');

    const pc = new RTCPeerConnection({ iceServers: this.opts.iceServers });
    this.pc = pc;

    // Listeners
    // ---------
    // Setup event listeners for the peer connection

    pc.addEventListener('connectionstatechange', () => {
      this.opts.onConnectionStateChange?.(pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.teardown();
      }
    });

    pc.addEventListener('datachannel', (event) => {
      this.registerChannel(event.channel);
    });

    pc.addEventListener('track', (event) => {
      this.registerTrack(event);
    });

    // Declarations
    // ------------
    // NOTE: this should be after hooking up necessary event listeners

    // Declare media transceivers based on the provided media specs
    // In the webrtc Body, a media spec is attached to the offer and the only reference to these transceivers will be their MID
    // The media spec does not know what MID will be assigned to its corresponding transceiver, therefore this declared mapping
    // is necessary to associate the two.
    const declared: Array<{ spec: MediaSpec; transceiver: RTCRtpTransceiver }> = [];
    for (const spec of this.opts.media ?? []) {
      const transceiver = pc.addTransceiver(spec.kind, { direction: spec.direction ?? 'recvonly' });
      declared.push({ spec, transceiver });
    }
    for (const track of this.opts.localTracks ?? []) {
      pc.addTrack(track);
    }

    // Declare channels based on the provided channel from options
    for (const init of this.opts.channels ?? []) {
      const { label, ...config } = normalizeChannel(init);
      this.registerChannel(pc.createDataChannel(label, config));
    }

    // Ensure that at least one channel or media spec has been declared
    if (this.channels.size === 0 && declared.length === 0) {
      throw new Error(
        'at least one channel or media spec is required, otherwise the offer ' +
          'negotiates nothing and the connection carries no payload',
      );
    }

    // Connecting
    // ----------
    // Create the offer and negotiate the connection

    try {
      // createOffer builds the SDP
      // setLocalDescription commits it, assign mid values, and starts the ICE gathering process
      //  since mid assignment happens here, the mid mapping must be done after
      await pc.setLocalDescription(await pc.createOffer());

      // At this point the transceivers have been declared and mid values have been assigned
      // We can now build the media spec to map "name" => "mid value"
      const mediaMap: SignalingRequest['media'] = [];
      for (const { spec, transceiver } of declared) {
        if (transceiver.mid === null) {
          throw new Error(`no mid assigned for media "${spec.name}"`);
        }
        this.midToName.set(transceiver.mid, spec.name);
        mediaMap.push({ mid: transceiver.mid ?? '', name: spec.name, kind: spec.kind });
      }

      await waitForIceGathering(pc, this.opts.iceGatheringTimeoutMs);

      const offer = pc.localDescription;
      if (!offer) throw new Error('local description missing after setLocalDescription');

      const body: SignalingRequest = {
        sdp: offer.sdp,
        type: offer.type,
        media: mediaMap,
      };

      const response = await fetch(this.opts.signalingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        throw new Error(`signalling failed: ${response.status} ${response.statusText}`);
      }

      const answer = (await response.json()) as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(answer);
    } catch (error) {
      this.teardown();
      throw error;
    }
  }

  // TODO: waitForChannel functions

  /**
   * Sends data over a specified RTCDataChannel.
   * @param label The label of the RTCDataChannel to send the data on.
   * @param data The data to send over the RTCDataChannel.
   * @returns A boolean indicating whether the data was successfully sent.
   */
  send(label: string, data: unknown): boolean {
    const channel = this.channels.get(label);

    // readyState is "connecting", "open", "closing" or "closed". send() throws
    // on anything but "open", so this guard keeps the boolean contract honest.
    if (!channel || channel.readyState !== 'open') return false;

    if (channel.bufferedAmount > this.opts.highWaterMark) return false;

    channel.send(typeof data === 'string' ? data : JSON.stringify(data));
    return true;
  }

  /**
   * Closes the WebRTC client and tears down all associated resources.
   */
  close(): void {
    this.teardown();
  }

  /**
   * Registers an RTCDataChannel and sets up event listeners for open, message, close, and error events.
   * @param channel The RTCDataChannel to register and manage events for.
   */
  private registerChannel(channel: RTCDataChannel): void {
    // Register the channel
    this.channels.set(channel.label, channel);

    // This function triggers when the channel is opened.
    // It triggers any pending callbacks waiting for the channel to open.
    const settle = () => {
      this.opts.onChannelOpen?.(channel.label, channel);
      const waiters = this.pendingOpen.get(channel.label);
      if (waiters) {
        this.pendingOpen.delete(channel.label);
        waiters.forEach((fn) => fn());
      }
    };

    // 'open' readyState indicates that the channel is already open (by the server)
    // otherwise channel is being created/closed by the client
    if (channel.readyState === 'open') {
      settle();
    } else {
      channel.addEventListener('open', settle);
    }
    channel.addEventListener('message', (event: MessageEvent) => {
      this.opts.onMessage?.(channel.label, decode(event.data), event);
    });
    channel.addEventListener('close', () => {
      this.channels.delete(channel.label);
      this.opts.onChannelClose?.(channel.label);
    });
    channel.addEventListener('error', (event) => {
      const err = (event as RTCErrorEvent).error;
      this.opts.onError?.(new Error(`channel "${channel.label}": ${err?.message ?? 'error'}`));
    });
  }

  /**
   * Registers an incoming RTC track, associates it with the correct MediaStream, and triggers the onTrack callback.
   * @param event The RTCTrackEvent containing the track and transceiver information.
   */
  private registerTrack(event: RTCTrackEvent): void {
    const mid = event.transceiver?.mid ?? null;
    const name = mid !== null ? this.midToName.get(mid) : undefined;

    if (!name) {
      // Name not recognized (from our mapping), server must've created the track or
      // a mapping for this mid is missing. Either way, report and send error.
      this.opts.onError?.(new Error(`inbound track on unmapped mid ${mid ?? '(none)'}; ignoring`));
      return;
    }

    // Checks if stream exists for this track name, creates a new one if it doesn't
    let stream = this.streams.get(name);
    if (!stream) {
      stream = new MediaStream();
      this.streams.set(name, stream);
    }

    // Add track to stream and trigger onTrack callback
    stream.addTrack(event.track);
    this.opts.onTrack?.(name, event.track, stream);
  }

  /**
   * Tears down the WebRTC connection by closing all channels, stopping all media tracks,
   * and closing the peer connection.
   */
  private teardown(): void {
    // Close all channels
    for (const channel of this.channels.values()) {
      channel.close();
    }
    this.channels.clear();
    this.pendingOpen.clear();

    // Close all media streams
    for (const stream of this.streams.values()) {
      stream.getTracks().forEach((track) => track.stop());
    }
    this.streams.clear();
    this.midToName.clear();

    // Close the peer connection
    this.pc?.close();
    this.pc = null;
  }
}
