import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // дозволити підключення з будь-якого клієнта
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const ROLES = ["A", "B", "C", "D", "E", "F"];
const playerData = {}; // { socketId: { name, role, group } }
const GROUPS = parseInt(process.env.GROUPS || 1); // кількість груп з ENV

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
    if (!group || group < 1 || group > GROUPS) return callback({ ok: false, error: "Невірна група" });

    const role = assignRole(group);
    if (!role) return callback({ ok: false, error: "Усі ролі зайняті у цій групі" });

    playerData[socket.id] = { name, role, group };
    console.log(`👤 ${name} отримав роль ${role} у групі ${group}`);

    socket.emit("card", { role, card: [] });
    callback({ ok: true, role, name, group });

    // надсилаємо оновлення всім гравцям у цій групі
    io.emit(
      "players",
      Object.values(playerData)
        .filter((p) => p.group === group)
        .map((p) => ({ name: p.name, role: p.role }))
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

    if (!allowed) return callback({ ok: false, error: "Цей напрямок заборонений" });

    const toSocketId = getSocketByRole(toRole, from.group);
    if (!toSocketId) return callback({ ok: false, error: `Гравець ${toRole} не знайдений` });

    io.to(toSocketId).emit("private_message", { from: from.role, name: from.name, text });
    callback({ ok: true });
  });

  socket.on("submit_answer", ({ answer }, callback) => {
    const from = playerData[socket.id];
    if (from?.role === "C") {
      // надсилаємо результат лише гравцям тієї ж групи
      Object.entries(playerData).forEach(([id, p]) => {
        if (p.group === from.group) {
          io.to(id).emit("game_result", {
            message: `💡 Гравець ${from.name} (${from.role}) надіслав відповідь: ${answer}`,
          });
        }
      });
      callback({ ok: true });
    } else {
      callback({ ok: false, error: "Лише C може відправити остаточну відповідь" });
    }
  });

  socket.on("disconnect", () => {
    const player = playerData[socket.id];
    if (player) {
      console.log("❌ Відключився:", player.name);
      delete playerData[socket.id];

      // оновлення гравців у групі
      io.emit(
        "players",
        Object.values(playerData)
          .filter((p) => p.group === player.group)
          .map((p) => ({ name: p.name, role: p.role }))
      );
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Сервер запущено на порті ${PORT}, кількість груп: ${GROUPS}`));
