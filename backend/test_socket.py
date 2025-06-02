import asyncio
import websockets

async def test():
    uri = "ws://localhost:8000/ws/signal/"
    async with websockets.connect(uri) as websocket:
        await websocket.send("hello from python")
        response = await websocket.recv()
        print("RESPONSE:", response)

asyncio.run(test())
