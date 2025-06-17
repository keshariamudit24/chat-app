import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 })

let userCount = 0;
let allSockets = [];

wss.on("connection", (socket) => {

    console.log("websocket server connected")
    userCount = userCount + 1;
    allSockets.push(socket)

    // whenever server gets a msg from client 
    socket.on("message", (msg) => {
        console.log("msg recieved : ", msg.toString());
        // broadcast it to other sockets 
        for(let i = 0; i < allSockets.length; i++){
            let s = allSockets[i];
            // sending msg to "s" socket from the server 
            s.send("sending msg from server" +  msg.toString())
        }
    })
})