import { useEffect, useRef, useState } from "react";
import DarkButton  from "./darkButton";

function App() {
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);


  const socketRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);


  const handleJoin = () => {
    if (!room.trim()) return;

    const socket = new WebSocket(`ws://localhost:8000/ws/signal/?room=${room}`);
    socketRef.current = socket;
    setJoined(true);

    socket.onopen = () => {
      console.log("✅ WebSocket connected");

      const peer = new RTCPeerConnection();
      peerRef.current = peer;

      // For the first client to join, create offer + data channel
      const channel = peer.createDataChannel("chat");
      dataChannelRef.current = channel;

      channel.onopen = () => {
        console.log("✅ Data channel is open");
      };

      channel.onmessage = (e) => {
        setMessages((prev) => [...prev, `🔵 Peer: ${e.data}`]);
      };

      // ICE candidate gathering
      peer.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.send(
            JSON.stringify({ type: "candidate", candidate: event.candidate })
          );
        }
      };

      // Start offer
      peer
        .createOffer()
        .then((offer) => {
          peer.setLocalDescription(offer);
          socket.send(JSON.stringify({ type: "offer", offer }));
        })
        .catch(console.error);
    };

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      const peer = peerRef.current;

      if (!peer) return;

      if (data.type === "error" && data.message === "Room is full") {
        alert("❌ Room is full. Only 2 users allowed.");
        socket.close();
        setJoined(false);
        return;
      }

      if (data.type === "offer") {
        console.log("📩 Received offer");
        peer.ondatachannel = (event) => {
          const channel = event.channel;
          dataChannelRef.current = channel;

          channel.onmessage = (e) => {
            setMessages((prev) => [...prev, `🔵 Peer: ${e.data}`]);
          };

          channel.onopen = () => {
            console.log("✅ Data channel open (answer side)");
          };
        };

        await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.send(JSON.stringify({ type: "answer", answer }));
      }

      if (data.type === "answer") {
        console.log("📩 Received answer");
        await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
      }

      if (data.type === "candidate" && data.candidate) {
        try {
          await peer.addIceCandidate(data.candidate);
        } catch (e) {
          console.warn("⚠️ Error adding candidate", e);
        }
      }
    };
  };

  const sendMessage = () => {
    if (
      dataChannelRef.current &&
      dataChannelRef.current.readyState === "open" &&
      inputRef.current
    ) {
      const msg = inputRef.current.value.trim();
      if (msg !== "") {
        dataChannelRef.current.send(msg);
        setMessages((prev) => [...prev, `🟢 You: ${msg}`]);
        inputRef.current.value = "";
      }
    } else {
      console.warn("⚠️ Data channel not ready yet");
    }
  };

  useEffect(() => {
    return () => {
      socketRef.current?.close();
      peerRef.current?.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-black dark:text-white flex flex-col items-center justify-center transition-colors duration-300">
      <div className="absolute top-4 right-4 px-4 py-">
        <DarkButton />
      </div>
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl text-white space-y-6">
        <h1 className="text-2xl font-semibold text-center text-blue-400">
          MCP Signaling Chat
        </h1>

        {!joined ? (
          <div className="space-y-4">
            <input
              className="w-full bg-gray-200 dark:bg-gray-700 dark:text-white text-black px-4 py-2 rounded"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Enter room name"
            />
            <button
              onClick={handleJoin}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 transition rounded-lg font-medium"
            >
              Join
            </button>
          </div>
        ) : (
          <div className="animate-fade-in-up transition-all duration-700 ease-out">
            <div className="flex justify-around mb-4">
              <h2 className="text-xl font-semibold text-blue-400">
                Room: <span className="dark:text-blue-400">{room}</span>
              </h2>
              <button
                onClick={() => window.location.reload()}
                className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-m"
              >
                Leave
              </button>
            </div>
            <div className="h-64 overflow-y-auto flex flex-col gap-2 p-2 rounded bg-gray-800 border border-gray-700">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[80%] px-4 py-2 rounded-lg shadow ${
                    msg.startsWith("🟢")
                      ? "self-end bg-green-600 text-white"
                      : "self-start bg-blue-600 text-white"
                  }`}
                >
                  {msg.replace(/^🟢 |^🔵 /, "")}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-2">
              <input
                ref={inputRef}
                placeholder="Type a message"
                className="flex-1 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 transition rounded-lg"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
