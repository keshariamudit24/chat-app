import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 })

interface User {
    socket: WebSocket;
    room: string
}

let allSockets: User[] = [];
let roomFreq: { [roomId: string]: number } = {};

console.log("server running");

wss.on("connection", (socket) => {

    // whenever server gets a msg from client 
    socket.on("message", (msg) => {
        try {
            const parsedMsg = JSON.parse(msg.toString());

            if (!parsedMsg.type) {
                throw new Error("Invalid message format");
            }

            // join a room - details given as payload
            if(parsedMsg.type === "join"){

                if (!roomFreq[parsedMsg.payload.roomId]) {
                    roomFreq[parsedMsg.payload.roomId] = 0;
                }

                roomFreq[parsedMsg.payload.roomId] += 1;
                console.log(`User connected. Total users: ${roomFreq[parsedMsg.payload.roomId]}`);
                
                // only two people can chat 
                if(roomFreq[parsedMsg.payload.roomId] > 2){
                    socket.send(JSON.stringify({
                        type: "error",
                        payload: { message: "Room is full" }
                    }));
                    socket.close();
                    return;
                }

                allSockets.push({
                    socket,
                    room: parsedMsg.payload.roomId
                });
                socket.send(JSON.stringify({
                    type: "joined",
                    payload: { roomId: parsedMsg.payload.roomId }
                }));
            }

            // chat functionality 
            if(parsedMsg.type === "chat"){

                // find the room id of the user / client / socket
                let currUserRoom = null
                for(let i = 0; i < allSockets.length; i++){
                    if(allSockets[i].socket === socket){
                        currUserRoom = allSockets[i].room
                        break;
                    }
                }
                
                if (!currUserRoom) {
                    throw new Error("User not in any room");
                }

                // sending the mesage to everyone present in that room 
                for(let i = 0; i < allSockets.length; i++){
                    if(allSockets[i].room === currUserRoom){
                        allSockets[i].socket.send(parsedMsg.payload.message)
                    }
                }

            }
        } catch (error) {
            socket.send(JSON.stringify({
                type: "error",
                payload: { message: "Invalid message format" }
            }));
        }
    });

    socket.on("close", () => {
        // Find the user
        const user = allSockets.find(user => user.socket === socket);

        if (user) {
            // Decrease room count
            roomFreq[user.room] -= 1;

            // If room becomes empty, optionally delete it
            if (roomFreq[user.room] <= 0) {
                delete roomFreq[user.room];
            }

            // Remove socket from list
            allSockets = allSockets.filter(u => u.socket !== socket);
            console.log(`User disconnected from room ${user.room}. Remaining: ${roomFreq[user.room] || 0}`);
        }
    });
});