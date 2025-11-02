import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.VITE_CLIENT_URL || "https://team-communication2.vercel.app";
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Ролі гравців
const ROLES = ["A", "B", "C", "D", "E", "F"];
// Дані гравців: { socketId: { name, role, group } }
const playerData = {};
// Кількість груп
const GROUP_COUNT = parseInt(process.env.VITE_GROUP_COUNT) || 1;

function assignRole(group) {
  const assignedRoles = Object.values(playerData)
    .filter((p) => p.group === group)
    .map((p) => p.role);
  const available = ROLES.filter((r) => !assignedRoles.includes(r));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function getSocketByRole(role, group) {
  for (const [id, player] of Object.entries(playerData)) {
    if (player.role === role && player.group === group) return id;
  }
  return null;
}

io.on("connection", (socket) => {
  console.log("🔗 Нове підключення:", socket.id);

  socket.on("register", ({ name, group }, callback) => {
    if (!group || group < 1 || group > GROUP_COUNT) group = 1;
    const role = assignRole(group);
    if (!role) return callback({ ok: false, error: "Усі ролі зайняті у цій групі" });

    playerData[socket.id] = { name, role, group };
    console.log(`👤 ${name} отримав роль ${role} у групі ${group}`);

    socket.emit("card", { role });
    callback({ ok: true, role, name, group });

    // Оновлюємо список гравців для цієї групи
    io.emit(
      "players",
      Object.values(playerData).map((p) => ({
        name: p.name,
        role: p.role,
        group: p.group,
      }))
    );
  });

  socket.on("send_message", ({ toRole, text }, callback) => {
    const from = playerData[socket.id];
    if (!from) return callback({ ok: false, error: "Неавторизований" });

    // Дозвіл відправки: B -> всі, інші -> B
    let allowed = false;
    if (from.role === "B") {
      allowed = ROLES.includes(toRole) && toRole !== "B";
    } else {
      allowed = toRole === "B";
    }

    if (!allowed) return callback({ ok: false, error: "Цей напрямок заборонений" });

    const toSocketId = getSocketByRole(toRole, from.group);
    if (!toSocketId) return callback({ ok: false, error: `Гравець ${toRole} не знайдений у вашій групі` });

    io.to(toSocketId).emit("private_message", {
      from: from.role,
      name: from.name,
      text,
    });

    callback({ ok: true });
  });

  socket.on("submit_answer", ({ answer }, callback) => {
    const from = playerData[socket.id];
    if (from?.role === "C") {
      io.emit("game_result", {
        message: `💡 Гравець ${from.name} (${from.role}) у групі ${from.group} надіслав відповідь: ${answer}`,
      });
      callback({ ok: true });
    } else {
      callback({ ok: false, error: "Лише C може відправити остаточну відповідь" });
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Відключився:", socket.id);
    delete playerData[socket.id];
    io.emit(
      "players",
      Object.values(playerData).map((p) => ({ name: p.name, role: p.role, group: p.group }))
    );
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Сервер запущено на порті ${PORT}`));
