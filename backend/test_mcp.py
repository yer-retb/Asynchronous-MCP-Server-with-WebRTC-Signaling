import asyncio
import websockets
import json

async def client(name, send_offer=False):
    uri = "ws://localhost:8000/ws/signal/?room=test-room"
    async with websockets.connect(uri) as ws:
        print(f"[{name}] Connected")

        if send_offer:
            # Send offer message
            offer_msg = {
                "type": "offer",
                "sdp": f"fake-sdp-from-{name}"
            }
            await ws.send(json.dumps(offer_msg))
            print(f"[{name}] Sent offer")

        try:
            while True:
                msg = await asyncio.wait_for(ws.recv(), timeout=5)
                print(f"[{name}] Received:", msg)
        except asyncio.TimeoutError:
            print(f"[{name}] Done (no more messages)")

async def run_test():
    print("🚀 Starting MCP backend test...")
    await asyncio.gather(
        client("Client1", send_offer=True),
        client("Client2"),
    )

if __name__ == "__main__":
    asyncio.run(run_test())
