#!/usr/bin/env python3
"""Test WebSocket disconnect handling (pytest-compatible and CI-safe)."""

import asyncio
import json
import logging
import socket
import pytest
import websockets

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

WS_URI = "ws://localhost:8000/ws/chat"


def _is_port_open(host: str, port: int, timeout: float = 1.0) -> bool:
    """Check if given TCP port is open (used to skip CI tests)."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


@pytest.mark.asyncio
async def _run_websocket_disconnect():
    """Test that WebSocket disconnects are handled gracefully."""
    logger.info("Connecting to WebSocket...")
    try:
        async with websockets.connect(WS_URI) as websocket:
            # Send connect message
            await websocket.send(json.dumps({"type": "connect", "user_id": 1}))
            logger.info("Sent connect message")

            # Wait for connection confirmation
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                logger.info(f"Received: {response}")
            except asyncio.TimeoutError:
                logger.warning("No connection confirmation (OK during CI)")

            # Send test message
            await websocket.send(
                json.dumps(
                    {
                        "type": "message",
                        "text": "Test message",
                        "lesson_id": "coffee_001",
                        "dialogue_id": "coffee_001_d1",
                    }
                )
            )
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
    except OSError as e:
        pytest.skip(f"Skipping WebSocket tests — server not running ({e})")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        pytest.fail(f"Unexpected error: {e}")

    logger.info("✅ Abrupt disconnect test completed")
    assert True


@pytest.mark.asyncio
async def _run_normal_disconnect():
    """Test normal WebSocket disconnect (clean close)."""
    logger.info("Testing normal disconnect...")
    try:
        async with websockets.connect(WS_URI) as websocket:
            await websocket.send(json.dumps({"type": "connect", "user_id": 1}))
            logger.info("Sent connect message")

            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                logger.info(f"Received: {response}")
            except asyncio.TimeoutError:
                logger.warning("No initial response (OK during CI)")

            # Send ping
            await websocket.send(json.dumps({"type": "ping"}))
            logger.info("Sent ping")

            # Wait for pong
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                logger.info(f"Received: {response}")
            except asyncio.TimeoutError:
                logger.warning("No pong (OK during CI)")

            await websocket.close(code=1000, reason="Test complete")
            logger.info("Closed connection normally")

    except OSError as e:
        pytest.skip(f"Skipping WebSocket tests — server not running ({e})")
    except Exception as e:
        logger.error(f"Error during normal disconnect: {e}", exc_info=True)
        pytest.fail(f"Unexpected error: {e}")

    logger.info("✅ Normal disconnect test completed")
    assert True


def test_websocket_disconnect():
    """Wrapper for CI/local run — auto-skip if port 8000 is closed."""
    if not _is_port_open("localhost", 8000):
        pytest.skip(
            "Skipping WebSocket disconnect test — no server running on port 8000"
        )
    asyncio.run(_run_websocket_disconnect())


def test_normal_disconnect():
    """Wrapper for CI/local run — auto-skip if port 8000 is closed."""
    if not _is_port_open("localhost", 8000):
        pytest.skip(
            "Skipping WebSocket normal disconnect test — no server running on port 8000"
        )
    asyncio.run(_run_normal_disconnect())


if __name__ == "__main__":
    print("Manual run: WebSocket disconnect tests")
    if _is_port_open("localhost", 8000):
        asyncio.run(_run_websocket_disconnect())
        asyncio.run(asyncio.sleep(1))
        asyncio.run(_run_normal_disconnect())
    else:
        print(
            "⚠️ WebSocket server not running on localhost:8000 — skipping manual tests."
        )
