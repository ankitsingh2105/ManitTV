const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connect = require("./connect");
const { Server } = require("socket.io");

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

connect("mongodb://127.0.0.1:27017/ManitTV");

app.get("", (req, response) => {
  response.send("Api is working");
});

app.listen(3000, () => {
  console.log("listening to port 3000");
});

const io = new Server(8000, {
  cors: true
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("room:join", ({ room }) => {
        socket.join(room);
        const data = { socketID: socket.id };
        io.to(room).emit("user:joined", data);
        const usersInRoom = Array.from(io.sockets.adapter.rooms.get(room) || []).filter(id => id !== socket.id);
        socket.emit("room:users", { users: [socket.id, ...usersInRoom] });
    });

    socket.on("get-room-users", ({ room }) => {
        const usersInRoom = Array.from(io.sockets.adapter.rooms.get(room) || []).filter(id => id !== socket.id);
        socket.emit("room:users", { users: [socket.id, ...usersInRoom] });
    });

    socket.on("user:call", ({ to, offer }) => {
        io.to(to).emit("incoming:call", { from: socket.id, offer });
    });

    socket.on("call:accepted", ({ to, ans }) => {
        io.to(to).emit("call:accepted", { from: socket.id, ans });
    });

    socket.on("ice-candidate", ({ to, candidate }) => {
        io.to(to).emit("ice-candidate", { from: socket.id, candidate });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        io.emit("user:left", { socketID: socket.id });
    });
});