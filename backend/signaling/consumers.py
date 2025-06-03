import json
from channels.generic.websocket import AsyncWebsocketConsumer

# Global room registry
rooms = {}

class SignalConsumer(AsyncWebsocketConsumer):
    
    async def connect(self):
        query_string = self.scope["query_string"].decode()
        room_param = dict(qc.split("=") for qc in query_string.split("&"))
        self.room_name = room_param.get("room", "default")
        self.room_group_name = f"chat_{self.room_name}"

        if self.room_name in rooms and len(rooms[self.room_name]) >= 2:
            await self.accept()
            await self.send(json.dumps({
                "type": "error",
                "message": "Room is full"
            }))
            await self.close()
            return

        await self.accept()

        if self.room_name not in rooms:
            rooms[self.room_name] = []

        rooms[self.room_name].append(self.channel_name)

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

    async def disconnect(self, code):
        if self.room_name in rooms and self.channel_name in rooms[self.room_name]:
            rooms[self.room_name].remove(self.channel_name)
            if not rooms[self.room_name]:
                del rooms[self.room_name]  # Optional: clean up empty room

        await self.channel_layer.group_discard(
            f"chat_{self.room_name}",
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            msg_type = data.get("type")
            if msg_type not in ["offer", "answer", "candidate", "leave"]:
                raise ValueError("Unsupported message type")

            # Send to others in the room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'signal.message',
                    'message': data,
                    'sender_channel': self.channel_name,
                }
            )
        except Exception as e:
            await self.send(text_data=json.dumps({ "error": str(e) }))

    async def signal_message(self, event):
        if event['sender_channel'] != self.channel_name:
            await self.send(text_data=json.dumps(event['message']))
