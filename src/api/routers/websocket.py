"""WebSocket chat endpoint."""
import asyncio
import json
import logging
from typing import Dict, Optional

from fastapi import WebSocket, WebSocketDisconnect

from src.core.app_context import app_context

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections."""
    
    def __init__(self):
        """Initialize connection manager."""
        # Active connections: {user_id: websocket}
        self.active_connections: Dict[int, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept a new WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            user_id: User ID
        """
        await websocket.accept()
        # For Phase 1: single user per connection, disconnect existing if any
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].close()
            except Exception:
                pass
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket connected for user {user_id}")
    
    def disconnect(self, user_id: int):
        """Remove a WebSocket connection.
        
        Args:
            user_id: User ID
        """
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"WebSocket disconnected for user {user_id}")
    
    async def send_personal_message(self, message: dict, user_id: int):
        """Send a message to a specific user.
        
        Args:
            message: Message dictionary to send
            user_id: User ID
        """
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                self.disconnect(user_id)


# Global connection manager instance
manager = ConnectionManager()


async def websocket_chat(websocket: WebSocket):
    """WebSocket endpoint for real-time chat.
    
    Handles:
    - Message type: "message" - user sends text
    - Response type: "typing" - server indicates thinking
    - Response type: "response" - server sends final response
    
    Args:
        websocket: WebSocket connection
    """
    user_id: Optional[int] = None
    
    try:
        # Accept connection
        await websocket.accept()
        
        # Wait for initial message with user_id
        initial_data = await websocket.receive_text()
        try:
            initial_msg = json.loads(initial_data)
            if initial_msg.get("type") == "connect" and "user_id" in initial_msg:
                user_id = initial_msg["user_id"]
                await manager.connect(websocket, user_id)
                # Send connection confirmation
                await websocket.send_json({
                    "type": "connected",
                    "message": "WebSocket connection established"
                })
            else:
                await websocket.close(code=1008, reason="Invalid initial message")
                return
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Invalid initial message: {e}")
            await websocket.close(code=1008, reason="Invalid initial message format")
            return
        
        # Main message loop
        while True:
            try:
                # Receive message
                data = await websocket.receive_text()
                message = json.loads(data)
                
                msg_type = message.get("type")
                
                if msg_type == "message":
                    # Process user message
                    text = message.get("text", "")
                    lesson_id = message.get("lesson_id", "")
                    dialogue_id = message.get("dialogue_id", "")
                    speed = message.get("speed", 1.0)
                    confidence = message.get("confidence")
                    
                    if not text or not lesson_id or not dialogue_id:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Missing required fields: text, lesson_id, dialogue_id"
                        })
                        continue
                    
                    # Send typing indicator
                    await websocket.send_json({
                        "type": "typing",
                        "message": "Tutor is thinking..."
                    })
                    
                    # Small delay to show typing indicator
                    await asyncio.sleep(0.3)
                    
                    # Get tutor response
                    tutor = app_context.tutor
                    response = tutor.respond(
                        user_id=user_id,
                        text=text,
                        lesson_id=lesson_id,
                        dialogue_id=dialogue_id,
                        speed=speed,
                        confidence=confidence,
                    )
                    
                    # Check if response is an error
                    if response.get("status") == "error":
                        await websocket.send_json({
                            "type": "error",
                            "message": response.get("message", "An error occurred")
                        })
                        continue
                    
                    # Send final response
                    await websocket.send_json({
                        "type": "response",
                        "data": response.get("data", {}),
                        "metadata": response.get("metadata", {})
                    })
                    
                elif msg_type == "ping":
                    # Heartbeat/ping message
                    await websocket.send_json({
                        "type": "pong",
                        "message": "pong"
                    })
                    
                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Unknown message type: {msg_type}"
                    })
                    
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON format"
                })
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}", exc_info=True)
                await websocket.send_json({
                    "type": "error",
                    "message": f"Internal server error: {str(e)}"
                })
                
    except WebSocketDisconnect:
        if user_id:
            manager.disconnect(user_id)
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        if user_id:
            manager.disconnect(user_id)
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except Exception:
            pass

