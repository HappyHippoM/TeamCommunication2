import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config(); // завантажуємо змінні середовища

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://team-communication2.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const MAX_GROUPS = 10;
let groupCount = 1;
const ROLES = ["A", "B", "C", "D", "E", "F"];
let groups = {};
for (let i = 1; i <= groupCount; i++) {
  groups[i] = { playerData: {}, roles: [] };
}

// беремо логін/пароль з .env
const ADMIN_CREDENTIALS = {
  user: process.env.ADMIN_USER || "admin",
  pass: process.env.ADMIN_PASS || "1234",
};

// --- допоміжні функції assignRole, getSocketByRole залишаються без змін ---

io.on("connection", (socket) => {
  console.log("🔗 Нове підключення:", socket.id);

  socket.on("admin_login", ({ user, pass }, callback) => {
    if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
      callback({ ok: true });
    } else {
      callback({ ok: false, error: "Невірний логін або пароль" });
    }
  });

  // інші обробники залишаються як у попередньому коді...
});

server.listen(4000, () => {
  console.log("🚀 Сервер запущено на порті 4000");
});
