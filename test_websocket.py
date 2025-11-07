#!/usr/bin/env python3
"""Test WebSocket disconnect handling."""
import asyncio
import json
import websockets
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_websocket_disconnect():
    """Test that WebSocket disconnects are handled gracefully."""
    uri = "ws://localhost:8000/ws/chat"
    
    try:
        # Connect to WebSocket
        logger.info("Connecting to WebSocket...")
        async with websockets.connect(uri) as websocket:
            # Send initial connect message
            connect_msg = {
                "type": "connect",
                "user_id": 1
            }
            await websocket.send(json.dumps(connect_msg))
            logger.info("Sent connect message")
            
            # Wait for connection confirmation
            response = await websocket.recv()
            logger.info(f"Received: {response}")
            
            # Send a test message
            test_msg = {
                "type": "message",
                "text": "Test message",
                "lesson_id": "coffee_001",
                "dialogue_id": "coffee_001_d1"
            }
            await websocket.send(json.dumps(test_msg))
            logger.info("Sent test message")
            
            # Wait a bit for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                logger.info(f"Received response: {response[:100]}...")
            except asyncio.TimeoutError:
                logger.warning("No response received (this is OK)")
            
            # Now disconnect abruptly (simulating client disconnect)
            logger.info("Disconnecting abruptly...")
            # Close the connection without sending close frame
            await websocket.close(code=1001)  # Going away
            
    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Connection closed (expected): {e}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        return False
    
    logger.info("✅ Test completed - check server logs for any errors")
    return True


async def test_normal_disconnect():
    """Test normal WebSocket disconnect."""
    uri = "ws://localhost:8000/ws/chat"
    
    try:
        logger.info("Testing normal disconnect...")
        async with websockets.connect(uri) as websocket:
            # Send initial connect message
            connect_msg = {
                "type": "connect",
                "user_id": 1
            }
            await websocket.send(json.dumps(connect_msg))
            logger.info("Sent connect message")
            
            # Wait for connection confirmation
            response = await websocket.recv()
            logger.info(f"Received: {response}")
            
            # Send ping
            ping_msg = {"type": "ping"}
            await websocket.send(json.dumps(ping_msg))
            logger.info("Sent ping")
            
            # Wait for pong
            response = await websocket.recv()
            logger.info(f"Received: {response}")
            
            # Normal close
            await websocket.close(code=1000, reason="Test complete")
            logger.info("Closed connection normally")
            
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        return False
    
    logger.info("✅ Normal disconnect test completed")
    return True


if __name__ == "__main__":
    print("Testing WebSocket disconnect handling...")
    print("=" * 50)
    
    # Test 1: Abrupt disconnect
    print("\nTest 1: Abrupt disconnect (code 1001)")
    result1 = asyncio.run(test_websocket_disconnect())
    
    # Wait a bit between tests
    asyncio.run(asyncio.sleep(1))
    
    # Test 2: Normal disconnect
    print("\nTest 2: Normal disconnect (code 1000)")
    result2 = asyncio.run(test_normal_disconnect())
    
    print("\n" + "=" * 50)
    if result1 and result2:
        print("✅ All tests completed successfully!")
        print("Check server logs to verify no errors occurred.")
    else:
        print("❌ Some tests failed. Check logs above.")

