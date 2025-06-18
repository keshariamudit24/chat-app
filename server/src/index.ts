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

                // Check room capacity before incrementing and adding user
                if(roomFreq[parsedMsg.payload.roomId] >= 2){
                    socket.send(JSON.stringify({
                        type: "system",
                        messageType: "error",
                        payload: { message: "Room is full", action: "ROOM_FULL" }
                    }));
                    return; // Don't increment counter or add to allSockets
                }

                roomFreq[parsedMsg.payload.roomId] += 1;
                console.log(`User connected. Total users: ${roomFreq[parsedMsg.payload.roomId]}`);
                
                allSockets.push({
                    socket,
                    room: parsedMsg.payload.roomId
                });
                socket.send(JSON.stringify({
                    type: "system",
                    messageType: "success",
                    payload: { message: "Successfully joined the room" }
                }));
            }

            if(parsedMsg.type === "leave") {
                const user = allSockets.find(u => u.socket === socket);
                if (user) {
                    // Notify others in the room that this user left
                    allSockets.forEach(u => {
                        if (u.room === user.room && u.socket !== socket) {
                            u.socket.send(JSON.stringify({
                                type: "system",
                                messageType: "info",
                                payload: { message: "Other user left the room", action: "ROOM_CLOSED" }
                            }));
                        }
                    });

                    // Clean up room
                    roomFreq[user.room] -= 1;
                    if (roomFreq[user.room] <= 0) {
                        delete roomFreq[user.room];
                    }
                    allSockets = allSockets.filter(u => u.socket !== socket);
                }
                return;
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
                    socket.send(JSON.stringify({
                        type: "system",
                        messageType: "error",
                        payload: { message: "You're not in a room", action: "NOT_IN_ROOM" }
                    }));
                    return;
                }

                // sending the message to everyone present in that room EXCEPT the sender
                for(let i = 0; i < allSockets.length; i++){
                    if(allSockets[i].room === currUserRoom && allSockets[i].socket !== socket){
                        allSockets[i].socket.send(JSON.stringify({
                            type: "chat",
                            payload: { 
                                message: parsedMsg.payload.msg,
                                isOutgoing: false  // This indicates it's an incoming message
                            }
                        }));
                    }
                }

            }
        } catch (error: any) {
            socket.send(JSON.stringify({
                type: "error",
                payload: { message: error.message || "Invalid message format" }
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

// {
//     "type": "join",
//     "payload": {
//         "roomId": "123"
//     }
// }

// {
//     "type": "chat",
//     "payload": {
//         "msg": "hi there"
//     }
// }