import asyncio
import json
import logging
from typing import Any

import zmq.asyncio
from aiortc import RTCDataChannel, RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from aiortc.contrib.media import MediaRelay
from av import VideoFrame
import cv2
import time
from fractions import Fraction

from fastapi import Request
from one_liner.client import RouterClient
import sys

logger = logging.getLogger(__name__)

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

stop_event: asyncio.Event = asyncio.Event()
tasks: list[asyncio.Task[Any]] = []


def cancel_tasks() -> None:
    for task in tasks:
        task.cancel()
    tasks.clear()


################################################################################
#
#   Data channel utility functions
#
################################################################################


def get_stream_poller(client: RouterClient, stream_name: str) -> zmq.asyncio.Poller:
    # Ensure SUB socket is subscribed to the stream PUB socket.
    if stream_name not in client.stream_client.sub_sockets:
        client.configure_stream(stream_name, storage_type="cache")

    # Wrap the SUB socket into a poller to efficiently wait for incoming messages.
    socket = client.stream_client.sub_sockets[stream_name]
    poller = zmq.asyncio.Poller()
    poller.register(socket, zmq.POLLIN)

    return poller


async def stream_to_channel(client: RouterClient, channel: RTCDataChannel) -> None:
    # Construct poller with the appropriate stream from the RouterClient (uses channel.label)
    poller = get_stream_poller(client, channel.label)

    # Continuously poll the stream and send any received messages to the data channel
    while not stop_event.is_set():
        if dict(await poller.poll(timeout=1000)):
            _, msg = client.get_stream(channel.label)
            channel.send(json.dumps(msg))


################################################################################
#
#   Video stream utility function
#
################################################################################


class ZMQStreamTrack(VideoStreamTrack):
    """
    VideoStreamTrack that streams frames received asynchronously from queue through aiortc to a WebRTC client.

    :param queue: queue containing RGB numpt arrays frames to be streamed.
    """

    kind = "video"

    def __init__(self, client: RouterClient, stream_name: str):
        """
        Parameters
        ----------
        client:
            a `RouterClient` that is receiving camera data.
        stream_name:
            a stream from the associated `RouterClient` that returns a frame as
            a numpy ndarray.
        """
        super().__init__()
        self.stream_name = stream_name
        self.client = client
        self.poller = get_stream_poller(client, stream_name)

    async def recv(self):
        try:
            await self.poller.poll(timeout=-1)
            timestamp, frame = self.client.get_stream(self.stream_name)
            frame = await asyncio.to_thread(
                cv2.cvtColor, frame, cv2.COLOR_RGB2YUV_I420
            )  # decreases encoding time to frontend
            video_frame = VideoFrame.from_ndarray(frame, format="yuv420p")
            # webrtc rtp uses 90kHz as standard clock rate
            video_frame.pts = int(time.monotonic() * 90000)  # presentation timestamp
            video_frame.time_base = Fraction(1, 90000)  # duration of one timestamp
            return video_frame

        except Exception as e:
            logger.error(e)


################################################################################
#
#   Main offer handler
#
################################################################################


async def handle_offer(client: RouterClient, request: Request) -> dict[str, str]:
    # Clear any existing tasks before handling a new offer
    cancel_tasks()
    params = await request.json()
    pc = RTCPeerConnection()
    await pc.setRemoteDescription(RTCSessionDescription(sdp=params["sdp"], type=params["type"]))

    @pc.on("connectionstatechange")
    async def on_connectionstatechange() -> None:
        """
        Handle changes in the WebRTC peer connection state.
        Logs the new state and closes the connection if it has failed or been closed.
        """
        logger.info(f"Peer connection state: {pc.connectionState}")
        if pc.connectionState in ("failed", "closed"):
            await pc.close()

    @pc.on("datachannel")
    async def on_datachannel(channel: RTCDataChannel) -> None:
        """
        Handle the opening of a new data channel from the browser.
        Creates a task that streams data. The name of the datachannel is used to find the
        corresponding `RouterClient` stream to stream data from.
        """
        # TODO: check if stream.label exists in client streams
        tasks.append(asyncio.create_task(stream_to_channel(client, channel)))

    # for t in pc.getTransceivers():
    #     if t.kind == "video":  # configure video sources
    #         stream_name = params["transceiverMidMapping"][t.mid]
    #         track = ZMQStreamTrack(client, stream_name)
    #         relay = MediaRelay()
    #         video = relay.subscribe(track)
    #         pc.addTrack(video)

    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    return {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}
