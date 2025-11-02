import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors({ origin: "*" })); // дозволяємо всі домени, можна замінити на свій Vercel URL

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // або "https://team-communication2.vercel.app"
    methods: ["GET", "POST"],
  },
});

const ROLES = ["A", "B", "C", "D", "E", "F"];
const MAX_GROUPS = 10;
let groupCount = 1;

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

// Підключення клієнта
io.on("connection", (socket) => {
  console.log("🔗 Нове підключення:", socket.id);

  socket.emit("group_count", groupCount);

  socket.on("register", ({ name, group }, callback) => {
    if (group < 1 || group > groupCount)
      return callback({ ok: false, error: "Невірна група" });

    const role = assignRole(group);
    if (!role) return callback({ ok: false, error: "Усі ролі зайняті в цій групі" });

    playerData[socket.id] = { name, role, group };
    console.log(`👤 ${name} отримав роль ${role} у групі ${group}`);

    socket.emit("card", { role });
    callback({ ok: true, role, name, group });

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
      return callback({ ok: false, error: `Гравець ${toRole} не знайдений у вашій групі` });

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
      Object.values(playerData).map((p) => ({
        name: p.name,
        role: p.role,
        group: p.group,
      }))
    );
  });
});

// Маршрут для перевірки серверу
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

server.listen(process.env.PORT || 10000, () => {
  console.log(`🚀 Сервер запущено на порті ${process.env.PORT || 10000}, кількість груп: ${groupCount}`);
});
