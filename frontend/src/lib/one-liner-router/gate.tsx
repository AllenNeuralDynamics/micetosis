import { useConfig } from '@/hooks/use-config.ts';
import { WebRTCProvider } from '../webrtc/provider.tsx';
import type { MediaSpec } from '../webrtc/types.ts';
import { useRPCsMetadata, useStreamsMetadata } from './metadata';
import type { ExpectedMediaStream, ExpectedRPC, ExpectedStream } from './validate-zmq-bindings.ts';
import { validateBindings } from './validate-zmq-bindings.ts';

interface OneLinerGateProps {
  children: React.ReactNode;
  expectedRPCs: ExpectedRPC[];
  expectedStreams: (ExpectedStream | ExpectedMediaStream)[];
}

/**
 * OneLinerGate does the following:
 *  - Retrieve RPC/Streams from RouterServer (with func signature schema)
 *  - Validate expected RPC/Streams exist
 *  - Setup WebRTC connections for the validated streams if necessary
 */
export const OneLinerGate = ({ children, expectedRPCs, expectedStreams }: OneLinerGateProps) => {
  // Get list of available RPCs and streams from RouterServer
  const { data: rpcs } = useRPCsMetadata();
  const { data: streams } = useStreamsMetadata();
  const config = useConfig();

  validateBindings(expectedRPCs, expectedStreams, rpcs ?? {}, streams ?? {});

  const isMedia = (s: ExpectedStream | ExpectedMediaStream): s is ExpectedMediaStream =>
    'kind' in s;

  // Several widgets may bind the same stream; negotiate each only once.
  const channels = [...new Set(expectedStreams.filter((s) => !isMedia(s)).map((s) => s.name))];

  const media: MediaSpec[] = [
    ...new Map(
      expectedStreams.filter(isMedia).map((s) => [s.name, { kind: s.kind, name: s.name }]),
    ).values(),
  ];

  return (
    <WebRTCProvider signalingUrl={config.server.offer_endpoint} channels={channels} media={media}>
      {children}
    </WebRTCProvider>
  );
};
