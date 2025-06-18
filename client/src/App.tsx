import { useState, useRef, useEffect } from 'react'
import './App.css'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [roomId, setRoomId] = useState<string>('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const wsRef = useRef();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendJoinMessage = (roomId: string) => {
    //@ts-ignore
    const ws: WebSocket = wsRef.current;

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "join",
        payload: { roomId }
      }));
    } else {
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: "join",
          payload: { roomId }
        }));
      };
    }
  };

  const generateRoom = () => {
   const newRoomId = Math.random().toString(36).substring(2, 9);
   setRoomId(newRoomId);
   setIsInRoom(true);  
   sendJoinMessage(newRoomId);
  };

  const joinRoom = () => {
    if (roomId.trim()) {
      setIsInRoom(true);
    }
    sendJoinMessage(roomId);
  };

  const sendMessage = () => {

    if (!isInRoom) {
      toast.error("You must join a room before sending messages");
      return;
    }

    if (inputMessage.trim()) {

      //@ts-ignore
      const ws: WebSocket = wsRef.current;

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "chat",
          payload: { msg: inputMessage }
        }));
      } else {
        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: "chat",
            payload: { msg: inputMessage }
          }));
        };
      }

      // setMessages(prev => [...prev, inputMessage]);
      setInputMessage('');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // create new websocket connection
    const ws = new WebSocket("ws://localhost:8080")

    // when recieved msg from the server, add it to the messages list 
    ws.onmessage = (event) => {

      console.log("Message from server:", event.data); // Add this line
      const data = JSON.parse(event.data);
      
      if (data.type === 'system') {
        if (data.messageType === 'success') {
          toast.success(data.payload.message);
        } else if (data.messageType === 'error') {
          toast.error(data.payload.message);
        }
        return;
      }

      console.log(data)

      setMessages(m => [...m, data.payload.message])
    }

    // @ts-ignore
    wsRef.current = ws;

  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex items-center justify-center">
      <ToastContainer position="top-right" />
      {!isInRoom ? (
        <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-8 text-center">Welcome to Chat Room</h1>
          <div className="space-y-4">
            <button
              onClick={generateRoom}
              className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded-lg transition-colors"
            >
              Create Room
            </button>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Room ID"
                className="flex-1 bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <button
                onClick={joinRoom}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-3xl w-full mx-auto bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 bg-gray-700">
            <h2 className="text-xl">Room ID: {roomId}</h2>
          </div>
          <div className="h-[500px] p-4 overflow-y-auto space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className="bg-gray-700 p-3 rounded-lg">
                {msg}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 bg-gray-700 flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 bg-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
