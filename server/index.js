import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const ROLES = ["A", "B", "C", "D", "E", "F"];
let players = {}; // { socketId: { name, role } }

function assignRole() {
  const assigned = ROLES.filter(
    (r) => !Object.values(players).some((p) => p.role === r)
  );
  return assigned[Math.floor(Math.random() * assigned.length)];
}

function allowedRecipients(fromRole) {
  if (fromRole === "B") return ROLES.filter((r) => r !== "B");
  return ["B"];
}

io.on("connection", (socket) => {
  console.log("Новий гравець підключився:", socket.id);

  socket.on("register", ({ name }) => {
    const role = assignRole();
    players[socket.id] = { name, role };
    socket.emit("assignRole", role);
    console.log(`Гравець ${name} отримав роль ${role}`);
  });

  socket.on("message", ({ from, text }) => {
    const recipients = allowedRecipients(from);
    for (let [id, player] of Object.entries(players)) {
      if (recipients.includes(player.role)) {
        io.to(id).emit("message", { from, text });
      }
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    console.log("Гравець відключився:", socket.id);
  });
});

server.listen(4000, () => console.log("Сервер запущено на 4000"));
