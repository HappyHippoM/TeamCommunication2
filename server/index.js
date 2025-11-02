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

const ROLES = ["A", "B", "C", "D", "E", "F"];
const playerData = {}; // { socketId: { name, role } }

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

  socket.on("register", ({ name }, callback) => {
    const role = assignRole();
    if (!role) return callback({ ok: false, error: "Усі ролі зайняті" });
    playerData[socket.id] = { name, role };
    console.log(`👤 ${name} отримав роль ${role}`);
    socket.emit("card", { role, card: [] });
    callback({ ok: true, role, name });
    io.emit(
      "players",
      Object.values(playerData).map((p) => ({ name: p.name, role: p.role }))
    );
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

    const toSocketId = getSocketByRole(toRole);
    if (!toSocketId)
      return callback({ ok: false, error: `Гравець ${toRole} не знайдений` });

    // передаємо ім'я і роль відправника
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
        message: `💡 Гравець ${from.name} (${from.role}) надіслав відповідь: ${answer}`,
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
      Object.values(playerData).map((p) => ({ name: p.name, role: p.role }))
    );
  });
});

server.listen(4000, () => {
  console.log("🚀 Сервер запущено на порті 4000");
});
