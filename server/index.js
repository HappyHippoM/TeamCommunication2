import express from "express";
import http from "http";
import { Server } from "socket.io";

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
let groupCount = 1; // за замовчуванням 1 група
const ROLES = ["A", "B", "C", "D", "E", "F"];

// групи: {1: {playerData:{}, roles:[]}, ...}
let groups = {};
for (let i = 1; i <= groupCount; i++) {
  groups[i] = { playerData: {}, roles: [] };
}

// простий логін/пароль адміна
const ADMIN_CREDENTIALS = { user: "admin", pass: "1234" };

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

io.on("connection", (socket) => {
  console.log("🔗 Нове підключення:", socket.id);

  // --- логін адміна ---
  socket.on("admin_login", ({ user, pass }, callback) => {
    if (user === ADMIN_CREDENTIALS.user && pass === ADMIN_CREDENTIALS.pass) {
      callback({ ok: true });
    } else {
      callback({ ok: false, error: "Невірний логін або пароль" });
    }
  });

  // --- адміністратор задає кількість груп ---
  socket.on("admin_set_groups", (count) => {
    groupCount = Math.min(Math.max(Number(count), 1), MAX_GROUPS);
    for (let i = 1; i <= groupCount; i++) {
      if (!groups[i]) groups[i] = { playerData: {}, roles: [] };
    }
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
    socket.join(`group-${group}`);
    socket.emit("card", { role, card: [] });
    callback({ ok: true, role, name, group });
    io.to(`group-${group}`).emit("players", Object.values(groups[group].playerData));
  });

  // --- повідомлення ---
  socket.on("send_message", ({ toRole, text }, callback) => {
    const groupId = Object.keys(groups).find((gid) => groups[gid].playerData[socket.id]);
    if (!groupId) return callback({ ok: false, error: "Неавторизований" });
    const from = groups[groupId].playerData[socket.id];
    let allowed = false;
    if (from.role === "B") allowed = ROLES.includes(toRole) && toRole !==
