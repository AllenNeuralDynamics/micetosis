import { useConfig } from '@/hooks/use-config.ts';
import { WebRTCProvider } from '../webrtc/provider.tsx';
import { useRPCsMetadata, useStreamsMetadata } from './metadata';
import type { ExpectedRPC, ExpectedStream } from './validate-zmq-bindings.ts';
import { validateBindings } from './validate-zmq-bindings.ts';

interface OneLinerProviderProps {
  children: React.ReactNode;
  expectedRPCs: ExpectedRPC[];
  expectedStreams: ExpectedStream[];
}

/**
 * OneLinerProvider does the following:
 *  - Retrieve RPC/Streams from RouterServer (with func signature schema)
 *  - Validate expected RPC/Streams exist
 *  - Setup WebRTC connections for the validated streams if necessary
 */
export const OneLinerProvider = ({
  children,
  expectedRPCs,
  expectedStreams,
}: OneLinerProviderProps) => {
  // Get list of available RPCs and streams from RouterServer
  const { data: rpcs } = useRPCsMetadata();
  const { data: streams } = useStreamsMetadata();
  const config = useConfig();

  validateBindings(expectedRPCs, expectedStreams, rpcs ?? {}, streams ?? {});

  return (
    <WebRTCProvider signalingUrl={config.server.offer_endpoint} channels={['dice_roll']}>
      {children}
    </WebRTCProvider>
  );
};
