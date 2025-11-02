import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.VITE_CLIENT_URL || "http://localhost:5173";
const PORT = process.env.PORT || 4000;

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// --- Глобальні налаштування ---
const ROLES = ["A", "B", "C", "D", "E", "F"];
let GROUP_COUNT = parseInt(process.env.GROUP_COUNT) || 1; // кількість груп
const playerData = {}; // { socketId: { name, role, group } }

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
    if (!group || group < 1 || group > GROUP_COUNT)
      return callback({ ok: false, error: "Невірна група" });

    const role = assignRole(group);
    if (!role) return callback({ ok: false, error: "Усі ролі зайняті" });

    playerData[socket.id] = { name, role, group };
    console.log(`👤 ${name} отримав роль ${role} в групі ${group}`);

    socket.emit("card", { role, card: [] });
    callback({ ok: true, role, name, group });

    // Оновлюємо список гравців у цій групі
    io.emit(
      "players",
      Object.values(playerData).map((p) => ({
        name: p.name,
        role: p.role,
        group: p.group,
      }))
    );

    // Надсилаємо поточну кількість груп всім клієнтам
    io.emit("group_count", GROUP_COUNT);
  });

  socket.on("send_message", ({ toRole, text }, callback) => {
    const from = playerData[socket.id];
    if (!from) return callback({ ok: false, error: "Неавторизований" });

    let allowed = false;
    if (from.role === "B") {
      allowed = ROLES.includes(toRole) && toRole !== "B";
    } else {
      allowed = toRole === "B";
    }

    if (!allowed)
      return callback({ ok: false, error: "Цей напрямок заборонений" });

    const toSocketId = getSocketByRole(toRole, from.group);
    if (!toSocketId)
      return callback({ ok: false, error: `Гравець ${toRole} не знайдений` });

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
      io.to(socket.id).emit("game_result", {
        message: `💡 Ваша відповідь надіслана: ${answer}`,
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
      Object.values(playerData).map((p) => ({
        name: p.name,
        role: p.role,
        group: p.group,
      }))
    );
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Сервер запущено на порті ${PORT}`);
});
