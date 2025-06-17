import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 })

interface User {
    socket: WebSocket;
    room: string
}

let userCount = 0;
let allSockets: User[] = [];

wss.on("connection", (socket) => {
    // whenever server gets a msg from client 
    socket.on("message", (msg) => {
        //@ts-ignore
        const parsedMsg = JSON.parse(msg)

        // join a room - details given as payload
        if(parsedMsg.type === "join"){
            allSockets.push({
                socket,
                room: parsedMsg.payload.roomId
            })
        }


        // chat functionality 
    })
})