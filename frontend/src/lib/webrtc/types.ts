export interface ChannelSpec {
  label: string;
  ordered?: boolean;
  maxRetransmits?: number;
  maxPacketLifeTime?: number;
  protocol?: string;
}

export type ChannelInit = string | ChannelSpec;

export interface MediaSpec {
  kind: 'video' | 'audio';
  name: string;
  direction?: RTCRtpTransceiverDirection;
}

export interface SignalingRequest {
  sdp: string;
  type: string;
  media: Array<{ mid: string; name: string; kind: string }>;
}
