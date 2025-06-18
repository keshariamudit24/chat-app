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
        if(parsedMsg.type === "chat"){

            // finding the room id of the sender (will be present coz already joined the room)
            let currUserRoom = null
            for(let i = 0; i < allSockets.length; i++){
                if(allSockets[i].socket === socket){
                    currUserRoom = allSockets[i].room;
                    break;
                }
            }

            // sending the mesage to everyone present in that room 
            for(let i = 0; i < allSockets.length; i++){
                if(allSockets[i].room === currUserRoom){
                    allSockets[i].socket.send(parsedMsg.paylload.msg)
                }
            }
        }
    })
})