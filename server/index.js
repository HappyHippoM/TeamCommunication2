import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://team-communication2.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const ROLES = ["A", "B", "C", "D", "E", "F"];
const playerData = {}; // { socketId: { name, role, group } }
let groupCount = 1;

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "1234";

function assignRole() {
  const assignedRoles = Object.values(playerData).map((p) => p.role);
  const available = ROLES.filter((r) => !assignedRoles.includes(r));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function getSocketByRole(role) {
  for (const [id, player] of Object.entries(playerData)) {
    if (player.role === role) return id;
  }
  return null;
}

io.on("connection", (socket) => {
  console.log("🔗 Нове підключення:", socket.id);
  socket.emit("group_count", groupCount);

  socket.on("register", ({ name, group }, callback) => {
    const role = assignRole();
    if (!role) return callback({ ok: false, error: "Усі ролі зайняті" });
    playerData[socket.id] = { name, role, group };
    console.log(`👤 ${name} отримав роль ${role} у групі ${group}`);
    socket.emit("card", { role, card: [`${role}.jpeg`] });
    callback({ ok: true, role, name, group });
  });

  socket.on("admin_login", ({ user, pass }, callback) => {
    if (user === ADMIN_USER && pass === ADMIN_PASS) callback({ ok: true });
    else callback({ ok: false, error: "Неправильний логін або пароль" });
  });

  socket.on("admin_set_groups", (count) => {
    groupCount = Math.max(1, Math.min(10, count));
    io.emit("group_count", groupCount);
  });

  socket.on("send_message", ({ toRole, text }, callback) => {
    const from = playerData[socket.id];
    if (!from) return callback({ ok: false, error: "Неавторизований" });

    let allowed = from.role === "B" ? ROLES.includes(toRole) && toRole !== "B" : toRole === "B";
    if (!allowed) return callback({ ok: false, error: "Цей напрямок заборонений" });

    const toSocketId = getSocketByRole(toRole);
    if (!toSocketId) return callback({ ok: false, error: `Гравець ${toRole} не знайдений` });

    io.to(toSocketId).emit("private_message", { from: from.role, name: from.name, text });
    callback({ ok: true });
  });

  socket.on("submit_answer", ({ answer }, callback) => {
    const from = playerData[socket.id];
    if (from?.role === "C") {
      io.emit("game_result", { message: `💡 Гравець ${from.name} (${from.role}) надіслав відповідь: ${answer}` });
      callback({ ok: true });
    } else {
      callback({ ok: false, error: "Лише C може відправити остаточну відповідь" });
    }
  });

  socket.on("disconnect", () => {
    delete playerData[socket.id];
  });
});

server.listen(4000, () => console.log("🚀 Сервер запущено на порті 4000"));
