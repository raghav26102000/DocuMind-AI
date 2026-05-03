from fastapi import WebSocket
from typing import Dict
import asyncio
import json

class Connection:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.input_queue: asyncio.Queue[dict] = asyncio.Queue()

    async def get_input(self) -> dict:
        got= await self.input_queue.get()
        print("got in get_input: ")
        return got

    async def put_input(self, data: dict):
        await self.input_queue.put(data)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Connection] = {}

    async def connect(self, application_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[application_id] = Connection(websocket)

    def disconnect(self, application_id: str):
        if application_id in self.active_connections:
            del self.active_connections[application_id]

    async def send_json(self, data: dict, application_id: str):
        if application_id in self.active_connections:
            await self.active_connections[application_id].websocket.send_json(data)

    async def get_user_input(self, application_id: str, question: str) -> dict:
        if application_id in self.active_connections:
            await self.send_json({"type": "user_input_request", "data": question}, application_id)
            return await self.active_connections[application_id].get_input()
        return {"error": "User is not connected."}

    async def wait_for_confirmation(self, application_id: str, messagetype: str) -> dict:
        if application_id in self.active_connections:
            got_input= await self.active_connections[application_id].get_input()
            if got_input.get("type") == messagetype:
                return got_input
            else:
                return {"error": "Connected but unexpected message type received for confirmation"}

        return {"error": "User is not connected."}

    async def forward_client_response(self, application_id: str, data: dict):
        if application_id in self.active_connections:
            await self.active_connections[application_id].put_input(data)

manager = ConnectionManager()
