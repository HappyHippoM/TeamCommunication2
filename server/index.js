import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "https://team-communication2.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "12345";

const ROLES = ["A", "B", "C", "D", "E", "F"];
let groupCount = 1;

// Структура: { groupId: { socketId: { name, role } } }
const groups = {};

// --- Допоміжні функції ---
function assignRole(groupId) {
  if (!groups[groupId]) groups[groupId] = {};
  const assignedRoles = Object.values(groups[groupId]).map((p) => p.role);
  const available = ROLES.filter((r) => !assignedRoles.includes(r));
  if (!available.length) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function getSocketByRole(groupId, role) {
  if (!groups[groupId]) return null;
  for (const [id, player] of Object.entries(groups[groupId])) {
    if (player.role === role) return id;
  }
  return null;
}

// --- Події Socket.io ---
io.on("connection", (socket) => {
  console.log("🔗 Нове підключення:", socket.id);

  // --- Реєстрація гравця ---
  socket.on("register", ({ name, group }, callback) => {
    if (group < 1 || group > groupCount)
      return callback({ ok: false, error: "Невірна група" });

    const role = assignRole(group);
    if (!role) return callback({ ok: false, error: "Усі ролі зайняті" });

    if (!groups[group]) groups[group] = {};
    groups[group][socket.id] = { name, role };
    console.log(`👤 ${name} отримав роль ${role} у групі ${group}`);

    socket.emit("card", { role });
    io.to(socket.id).emit("group_count", groupCount);

    callback({ ok: true, role, name, group });

    // Надсилаємо усім у групі список гравців
    const groupPlayers = Object.values(groups[group]).map((p) => ({
      name: p.name,
      role: p.role,
    }));
    Object.keys(groups[group]).forEach((sid) =>
      io.to(sid).emit("players", groupPlayers)
    );
  });

  // --- Надсилання повідомлень ---
  socket.on("send_message", ({ toRole, text }, callback) => {
    const groupId = Object.keys(groups).find(
      (g) => groups[g][socket.id] !== undefined
    );
    if (!groupId) return callback({ ok: false, error: "Не в групі" });
    const from = groups[groupId][socket.id];
    if (!from) return callback({ ok: false, error: "Неавторизований" });

    let allowed = false;
    if (from.role === "B") allowed = ROLES.includes(toRole) && toRole !== "B";
    else allowed = toRole === "B";

    if (!allowed)
      return callback({ ok: false, error: "Цей напрямок заборонений" });

    const toSocketId = getSocketByRole(groupId, toRole);
    if (!toSocketId)
      return callback({ ok: false, error: `Гравець ${toRole} не знайдений` });

    io.to(toSocketId).emit("private_message", {
      from: from.role,
      name: from.name,
      text,
    });

    callback({ ok: true });
  });

  // --- Відправка остаточної відповіді (тільки C) ---
  socket.on("submit_answer", ({ answer }, callback) => {
    const groupId = Object.keys(groups).find(
      (g) => groups[g][socket.id] !== undefined
    );
    const from = groupId ? groups[groupId][socket.id] : null;
    if (!from) return callback({ ok: false, error: "Неавторизований" });

    if (from.role !== "C")
      return callback({ ok: false, error: "Лише C може відправити відповідь" });

    // надсилаємо всім гравцям групи результат
    Object.keys(groups[groupId]).forEach((sid) => {
      io.to(sid).emit("game_result", {
        message: `💡 Гравець ${from.name} (${from.role}) надіслав відповідь: ${answer}`,
      });
    });

    callback({ ok: true });
  });

  // --- Вхід адміна ---
  socket.on("admin_login", ({ user, pass }, callback) => {
    if (user === ADMIN_LOGIN && pass === ADMIN_PASS) return callback({ ok: true });
    callback({ ok: false, error: "Невірний логін або пароль" });
  });

  // --- Встановлення кількості груп адміном ---
  socket.on("admin_set_groups", (count) => {
    groupCount = Math.max(1, Math.min(10, Number(count) || 1));
    io.emit("group_count", groupCount);
  });

  // --- Відключення ---
  socket.on("disconnect", () => {
    console.log("❌ Відключився:", socket.id);
    for (const g of Object.keys(groups)) {
      if (groups[g][socket.id]) delete groups[g][socket.id];
    }
  });
});

// --- Сервер ---
server.listen(process.env.PORT || 4000, () =>
  console.log("🚀 Сервер запущено на порті 4000")
);
