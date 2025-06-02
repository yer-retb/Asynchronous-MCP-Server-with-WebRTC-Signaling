import json
from channels.generic.websocket import AsyncWebsocketConsumer

# Global room registry
rooms = {}

class SignalConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['query_string'].decode().replace("room=", "")
        self.room_group_name = f"signaling_{self.room_name}"

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        if self.room_name not in rooms:
            rooms[self.room_name] = []
        rooms[self.room_name].append(self.channel_name)

        await self.accept()
        print(f" {self.channel_name} joined {self.room_name}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        if self.room_name in rooms:
            rooms[self.room_name].remove(self.channel_name)
            if not rooms[self.room_name]:
                del rooms[self.room_name]
        print(f" {self.channel_name} left {self.room_name}")

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
