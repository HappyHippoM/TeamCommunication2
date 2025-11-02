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

// Ролі гравців
const ROLES = ["A", "B", "C", "D", "E", "F"];
// Структура: { socketId: { name, role, group } }
const playerData = {};
let groupCount = 1; // за замовчуванням 1 група

// Прості креденшали адміна через .env
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "password";

// --- Допоміжні функції ---
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

// --- Socket.io ---
io.on("connection", (socket) => {
  console.log("🔗 Нове підключення:", socket.id);

  // --- Реєстрація гравця ---
  socket.on("register", ({ name, group }, callback) => {
    if (!group || group < 1 || group > groupCount)
      return callback({ ok: false, error: "Некоректна група" });

    const role = assignRole(group);
    if (!role) return callback({ ok: false, error: "Усі ролі зайняті" });

    playerData[socket.id] = { name, role, group };
    console.log(`👤 ${name} отримав роль ${role} у групі ${group}`);

    socket.emit("card", { role }); // можна додати картку
    callback({ ok: true, role, name, group });

    // Повідомляємо гравців в групі про всіх учасників
    const playersInGroup = Object.values(playerData)
      .filter((p) => p.group === group)
      .map((p) => ({ name: p.name, role: p.role }));
    io.to(socket.id).emit("players", playersInGroup);
  });

  // --- Відправка повідомлень ---
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

  // --- Відправка відповіді (C може надсилати) ---
  socket.on("submit_answer", ({ answer }, callback) => {
    const from = playerData[socket.id];
    if (from?.role === "C") {
      // надсилаємо лише гравцям у групі
      Object.entries(playerData)
        .filter(([_, p]) => p.group === from.group)
        .forEach(([id]) => {
          io.to(id).emit("game_result", {
            message: `💡 Гравець ${from.name} (${from.role}) надіслав відповідь: ${answer}`,
          });
        });
      callback({ ok: true });
    } else {
      callback({ ok: false, error: "Лише C може відправити остаточну відповідь" });
    }
  });

  // --- Вхід адміна ---
  socket.on("admin_login", ({ user, pass }, callback) => {
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      callback({ ok: true });
    } else {
      callback({ ok: false, error: "Невірний логін або пароль" });
    }
  });

  // --- Адмін встановлює кількість груп ---
  socket.on("admin_set_groups", (count) => {
    if (count >= 1 && count <= 10) {
      groupCount = count;
      io.emit("group_count", groupCount); // повідомляємо всіх клієнтів
    }
  });

  // --- Відключення ---
  socket.on("disconnect", () => {
    console.log("❌ Відключився:", socket.id);
    delete playerData[socket.id];
  });
});

server.listen(process.env.PORT || 4000, () => {
  console.log("🚀 Сервер запущено на порті 4000");
});
