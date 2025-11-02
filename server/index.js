import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://team-communication2.vercel.app", // твій домен на Vercel
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const MAX_GROUPS = 10;
let groupCount = 1; // за замовчуванням 1 група
const ROLES = ["A", "B", "C", "D", "E", "F"];

// Структура даних:
// groups = { 1: { playerData: {socketId: {name, role}}, roles: [] }, 2: {...} }
let groups = {};
for (let i = 1; i <= groupCount; i++) {
  groups[i] = { playerData: {}, roles: [] };
}

// --- допоміжні функції ---
function assignRole(groupId) {
  const g = groups[groupId];
  const assignedRoles = Object.values(g.playerData).map((p) => p.role);
  const available = ROLES.filter((r) => !assignedRoles.includes(r));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function getSocketByRole(groupId, role) {
  const g = groups[groupId];
  for (const [id, player] of Object.entries(g.playerData)) {
    if (player.role === role) return id;
  }
  return null;
}

// --- події ---
io.on("connection", (socket) => {
  console.log("🔗 Нове підключення:", socket.id);

  // --- адміністратор задає кількість груп ---
  socket.on("admin_set_groups", (count) => {
    groupCount = Math.min(Math.max(Number(count), 1), MAX_GROUPS);
    for (let i = 1; i <= groupCount; i++) {
      if (!groups[i]) groups[i] = { playerData: {}, roles: [] };
    }
    // видаляємо старі групи якщо їх менше
    Object.keys(groups)
      .filter((k) => k > groupCount)
      .forEach((k) => delete groups[k]);
    io.emit("group_count", groupCount);
    console.log("🛠 Адмін встановив груп:", groupCount);
  });

  // --- реєстрація гравця ---
  socket.on("register", ({ name, group }, callback) => {
    if (!groups[group]) return callback({ ok: false, error: "Група не існує" });
    const role = assignRole(group);
    if (!role) return callback({ ok: false, error: "Усі ролі зайняті в групі" });

    groups[group].playerData[socket.id] = { name, role };
    groups[group].roles.push(role);

    console.log(`👤 ${name} отримав роль ${role} у групі ${group}`);
    socket.join(`group-${group}`);
    socket.emit("card", { role, card: [] });
    callback({ ok: true, role, name, group });

    // відправляємо оновлення всім учасникам групи
    const gPlayers = Object.values(groups[group].playerData).map((p) => ({
      name: p.name,
      role: p.role,
    }));
    io.to(`group-${group}`).emit("players", gPlayers);
  });

  // --- відправка повідомлення ---
  socket.on("send_message", ({ toRole, text }, callback) => {
    // знайти групу гравця
    const groupId = Object.keys(groups).find((gid) => groups[gid].playerData[socket.id]);
    if (!groupId) return callback({ ok: false, error: "Неавторизований" });

    const from = groups[groupId].playerData[socket.id];

    // логіка дозволу повідомлень
    let allowed = false;
    if (from.role === "B") {
      allowed = ROLES.includes(toRole) && toRole !== "B";
    } else {
      allowed = toRole === "B";
    }

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

  // --- відправка остаточної відповіді (C) ---
  socket.on("submit_answer", ({ answer }, callback) => {
    const groupId = Object.keys(groups).find((gid) => groups[gid].playerData[socket.id]);
    if (!groupId) return callback({ ok: false, error: "Не в групі" });
    const from = groups[groupId].playerData[socket.id];
    if (from?.role !== "C") return callback({ ok: false, error: "Лише C може відправити остаточну відповідь" });

    // надсилаємо всім учасникам групи
    io.to(`group-${groupId}`).emit("game_result", {
      message: `💡 Гравець ${from.name} (${from.role}) надіслав відповідь: ${answer}`,
    });

    callback({ ok: true });
  });

  // --- відключення ---
  socket.on("disconnect", () => {
    console.log("❌ Відключився:", socket.id);
    const groupId = Object.keys(groups).find((gid) => groups[gid].playerData[socket.id]);
    if (groupId) {
      const g = groups[groupId];
      const role = g.playerData[socket.id]?.role;
      g.roles = g.roles.filter((r) => r !== role);
      delete g.playerData[socket.id];
      // оновлення списку гравців групи
      const gPlayers = Object.values(g.playerData).map((p) => ({ name: p.name, role: p.role }));
      io.to(`group-${groupId}`).emit("players", gPlayers);
    }
  });
});

server.listen(4000, () => {
  console.log("🚀 Сервер запущено на порті 4000");
});
