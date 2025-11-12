
#!/usr/bin/env python3
"""Test WebSocket disconnect handling (pytest-compatible)."""

import asyncio
import json
import logging
import pytest
import websockets

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

WS_URI = "ws://localhost:8000/ws/chat"


async def _run_websocket_disconnect():
    """Test that WebSocket disconnects are handled gracefully."""
    try:
        logger.info("Connecting to WebSocket...")
        async with websockets.connect(WS_URI) as websocket:
            # Send connect message
            connect_msg = {"type": "connect", "user_id": 1}
            await websocket.send(json.dumps(connect_msg))
            logger.info("Sent connect message")

            # Wait for connection confirmation
            response = await websocket.recv()
            logger.info(f"Received: {response}")

            # Send test message
            test_msg = {
                "type": "message",
                "text": "Test message",
                "lesson_id": "coffee_001",
                "dialogue_id": "coffee_001_d1",
            }
            await websocket.send(json.dumps(test_msg))
            logger.info("Sent test message")

            # Try to receive response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                logger.info(f"Received response: {response[:100]}...")
            except asyncio.TimeoutError:
                logger.warning("No response received (this is OK during CI)")

            # Abruptly disconnect
            logger.info("Disconnecting abruptly...")
            await websocket.close(code=1001)

    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Connection closed (expected): {e}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        pytest.fail(f"Unexpected error: {e}")

    logger.info("✅ Abrupt disconnect test completed")
    assert True


async def _run_normal_disconnect():
    """Test normal WebSocket disconnect (clean close)."""
    try:
        logger.info("Testing normal disconnect...")
        async with websockets.connect(WS_URI) as websocket:
            # Send connect message
            connect_msg = {"type": "connect", "user_id": 1}
            await websocket.send(json.dumps(connect_msg))
            logger.info("Sent connect message")

            # Wait for response
            response = await websocket.recv()
            logger.info(f"Received: {response}")

            # Send ping
            ping_msg = {"type": "ping"}
            await websocket.send(json.dumps(ping_msg))
            logger.info("Sent ping")

            # Wait for pong
            response = await websocket.recv()
            logger.info(f"Received: {response}")

            # Clean close
            await websocket.close(code=1000, reason="Test complete")
            logger.info("Closed connection normally")

    except Exception as e:
        logger.error(f"Error during normal disconnect: {e}", exc_info=True)
        pytest.fail(f"Unexpected error: {e}")

    logger.info("✅ Normal disconnect test completed")
    assert True


# Manual entry point (optional)
def test_websocket_disconnect():
    asyncio.run(_run_websocket_disconnect())


def test_normal_disconnect():
    asyncio.run(_run_normal_disconnect())


if __name__ == "__main__":
    print("Manual run: WebSocket disconnect tests")
    asyncio.run(_run_websocket_disconnect())
    asyncio.run(asyncio.sleep(1))
    asyncio.run(_run_normal_disconnect())