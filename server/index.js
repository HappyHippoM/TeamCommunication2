import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://team-communication2.vercel.app", // дозволяємо лише твій клієнт
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const ROLES = ["A","B","C","D","E","F"];
let players = {};

function assignRole() {
  const assigned = ROLES.filter(r => !Object.values(players).some(p => p.role === r));
  return assigned[Math.floor(Math.random() * assigned.length)];
}

function allowedRecipients(fromRole) {
  if(fromRole === "B") return ROLES.filter(r => r!=="B");
  return ["B"];
}

io.on("connection", (socket) => {
  console.log("Новий гравець підключився:", socket.id);

  socket.on("register", ({name}) => {
    const role = assignRole();
    players[socket.id] = {name, role};
    socket.emit("role_assigned", role);
    console.log(`Гравець ${name} отримав роль ${role}`);
  });

  socket.on("send_message", ({from, toRole, text}) => {
    for(let [id, player] of Object.entries(players)) {
      if(toRole === player.role) {
        io.to(id).emit("private_message", {from, text});
      }
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    console.log("Гравець відключився:", socket.id);
  });
});

server.listen(4000, () => console.log("Сервер запущено на 4000"));
