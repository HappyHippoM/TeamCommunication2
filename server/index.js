import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://team-communication2.vercel.app", // твій Vercel домен
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

const ROLES = ["A", "B", "C", "D", "E", "F"];
const MAX_GROUPS = 10;

let groupCount = 1;
const groups = {}; // { groupId: { socketId: {name, role} } }

io.on("connection", (socket) => {
  console.log("🔗 Нове підключення:", socket.id);

  // --- Адмін ---
  socket.on("admin_login", ({ user, pass }, callback) => {
    if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
      callback({ ok: true });
    } else {
      callback({ ok: false, error: "Невірний логін або пароль" });
    }
  });

  socket.on("admin_set_groups", (count) => {
    const c = Math.max(1, Math.min(MAX_GROUPS, Number(count) || 1));
    groupCount = c;
    io.emit("group_count", groupCount);
    console.log(`Адмін встановив ${groupCount} груп`);
  });

  // --- Гравці ---
  socket.on("register", ({ name, group }, callback) => {
    if (!group || group < 1 || group > groupCount)
      return callback({ ok: false, error: "Невірна група" });

    if (!groups[group]) groups[group] = {};

    // Автопризначення ролі
    const assignedRoles = Object.values(groups[group]).map((p) => p.role);
    const available = ROLES.filter((r) => !assignedRoles.includes(r));
    if (available.length === 0)
      return callback({ ok: false, error: "Усі ролі зайняті у цій групі" });

    const role = available[Math.floor(Math.random() * available.length)];
    groups[group][socket.id] = { name, role };

    socket.data = { role, group, name };
    console.log(`👤 ${name} приєднався до групи ${group} як ${role}`);

    socket.emit("card", { role });
    callback({ ok: true, role, name, group });

    // Надсилаємо всім у групі список гравців
    io.to(`group_${group}`).emit(
      "players",
      Object.values(groups[group]).map((p) => ({ name: p.name, role: p.role }))
    );

    socket.join(`group_${group}`);
    io.to(socket.id).emit("group_count", groupCount);
  });

  // --- Відправка повідомлень ---
  socket.on("send_message", ({ toRole, text }, callback) => {
    const from = socket.data;
    if (!from) return callback({ ok: false, error: "Неавторизований" });

    const groupPlayers = groups[from.group];
    if (!groupPlayers) return callback({ ok: false, error: "Група не знайдена" });

    let allowed = false;
    if (from.role === "B") {
      allowed = ROLES.includes(toRole) && toRole !== "B";
    } else {
      allowed = toRole === "B";
    }

    if (!allowed) return callback({ ok: false, error: "Цей напрямок заборонений" });

    const toSocketId = Object.entries(groupPlayers).find(([id, p]) => p.role === toRole)?.[0];
    if (!toSocketId) return callback({ ok: false, error: `Гравець ${toRole} не знайдений` });

    io.to(toSocketId).emit("private_message", {
      from: from.role,
      name: from.name,
      text,
    });

    callback({ ok: true });
  });

  // --- Остаточна відповідь (тільки C) ---
  socket.on("submit_answer", ({ answer }, callback) => {
    const from = socket.data;
    if (from?.role === "C") {
      io.to(`group_${from.group}`).emit("game_result", {
        message: `💡 Гравець ${from.name} (${from.role}) надіслав відповідь: ${answer}`,
      });
      callback({ ok: true });
    } else {
      callback({ ok: false, error: "Лише C може відправити остаточну відповідь" });
    }
  });

  // --- Відключення ---
  socket.on("disconnect", () => {
    const d = socket.data;
    if (d && groups[d.group] && groups[d.group][socket.id]) {
      console.log(`❌ ${d.name} (${d.role}) вийшов з групи ${d.group}`);
      delete groups[d.group][socket.id];
      io.to(`group_${d.group}`).emit(
        "players",
        Object.values(groups[d.group]).map((p) => ({ name: p.name, role: p.role }))
      );
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Сервер запущено на порті ${PORT}`);
});
