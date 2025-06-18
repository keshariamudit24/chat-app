import { useEffect, useRef, useState } from 'react'
import './App.css'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Message {
  text: string;
  isOutgoing: boolean;
}

function App() {
  const [isJoined, setIsJoined] = useState(() => {
    // Initialize from localStorage if exists
    const saved = localStorage.getItem('chatRoom');
    return saved ? true : false;
  });
  const [roomId, setRoomId] = useState(() => {
    return localStorage.getItem('chatRoom') || '';
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('chatMessages');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputMessage, setInputMessage] = useState('');
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendJoinMessage = (roomId: string) => {
    if (ws.current) {
      if (ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: "join",
          payload: { roomId }
        }));
      } else {
        ws.current.onopen = () => {
          ws.current?.send(JSON.stringify({
            type: "join",
            payload: { roomId }
          }));
        };
      }
    }
  };

  const generateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 9);
    setRoomId(newRoomId);
    localStorage.setItem('chatRoom', newRoomId); 
    setIsJoined(true);
    sendJoinMessage(newRoomId);
  };

  const joinRoom = () => {
    if (roomId.trim()) {
      setIsJoined(true);
      localStorage.setItem('chatRoom', roomId); 
      sendJoinMessage(roomId);
    }
  };

  const sendMessage = () => {

    if (!isJoined) {
      toast.error("You must join a room before sending messages");
      return;
    }

    if (inputMessage.trim()) {

      // Add message to local state immediately
      setMessages(prev => [...prev, {
        text: inputMessage,
        isOutgoing: true
      }]);

      if (ws.current) {
        if (ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            type: "chat",
            payload: { msg: inputMessage }
          }));
        } else {
          ws.current.onopen = () => {
            ws.current?.send(JSON.stringify({
              type: "chat",
              payload: { msg: inputMessage }
            }));
          };
        }
      }

      setInputMessage('');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Save to localStorage on every update
    localStorage.setItem('chatMessages', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  const handleLeaveRoom = () => {
    if (ws.current) {
      ws.current.send(JSON.stringify({ type: "leave" }));
      setIsJoined(false);
      setMessages([]);
      localStorage.removeItem('chatRoom');
      localStorage.removeItem('chatMessages'); 
    }
  };

  useEffect(() => {
    window.history.pushState(null, '', window.location.pathname);
    const handlePopState = () => {
      if (isJoined) {
        handleLeaveRoom(); // OK here since it's a back action
        window.history.pushState(null, '', window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);

    window.addEventListener('beforeunload', (e) => {
      if (isJoined) {
        // Don't remove chatRoom on reload/close
        ws.current?.close(); // just close the socket
      }
    });

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isJoined]);

  useEffect(() => {
    const connectWebSocket = () => {
      ws.current = new WebSocket('ws://localhost:8080');

      ws.current.onopen = () => {
        // If we were in a room before reload, rejoin it
        const savedRoom = localStorage.getItem('chatRoom');
        if (savedRoom) {
          ws.current?.send(JSON.stringify({
            type: 'join',
            payload: { roomId: savedRoom }
          }));
        }
      };

      ws.current.onmessage = (event) => {
        console.log("Message from server:", event.data); // Add this line
        const data = JSON.parse(event.data);
        
        if (data.type === 'system') {
          if (data.messageType === 'success') {
            toast.success(data.payload.message);
            setIsJoined(true);
          } else if (data.messageType === 'error') {
            toast.error(data.payload.message);
            if (data.payload.action === 'ROOM_FULL') {
              setIsJoined(false);
              localStorage.removeItem('chatRoom');
            }
          } else if (data.messageType === 'info') {
            toast.info(data.payload.message);
            if (data.payload.action === 'ROOM_CLOSED') {
              setIsJoined(false);
              setMessages([]);
              localStorage.removeItem('chatRoom');
            }
          }
          return;
        }

        console.log(data)

        if (data.type === 'chat') {
          setMessages(prev => [...prev, {
            text: data.payload.message,
            isOutgoing: false // incoming message
          }]);
        }
      };

      ws.current.onclose = () => {
        // Only try to reconnect if we're supposed to be in a room
        if (localStorage.getItem('chatRoom')) {
          setTimeout(connectWebSocket, 1000);
        }
      };
    };

    connectWebSocket();

    return () => {
      ws.current?.close(); // just close socket
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex items-center justify-center">
      <ToastContainer position="top-right" />
      {!isJoined ? (
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
          <div className="p-4 bg-gray-700 flex justify-between items-center">
            <h2 className="text-xl">Room ID: {roomId}</h2>
            <button
              onClick={handleLeaveRoom}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              Leave
            </button>
          </div>
          <div className="h-[500px] p-4 overflow-y-auto space-y-4">
            <div className="messages">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`message ${msg.isOutgoing ? 'outgoing' : 'incoming'}`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
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
