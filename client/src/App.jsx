import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER = import.meta.env.VITE_SERVER || "https://teamcommunicationgame.onrender.com";
const socket = io(SERVER, { transports: ["websocket", "polling"] });

export default function App() {
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [group, setGroup] = useState(1);
  const [groupCount, setGroupCount] = useState(1);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState("");
  const [isAdminLogin, setIsAdminLogin] = useState(false);

  useEffect(() => {
    socket.on("connect", () => console.log("🔗 Підключено"));
    socket.on("disconnect", () => console.log("❌ Відключено"));
    socket.on("group_count", (count) => setGroupCount(count));
    socket.on("card", ({ role }) => setRole(role));
  }, []);

  const adminLogin = () => {
    setAdminError("");
    socket.emit("admin_login", { user: adminUser, pass: adminPass }, (res) => {
      if (!res.ok) return setAdminError(res.error);
      setRole("admin");
    });
  };

  const setGroupsAdmin = () => {
    const count = Math.max(1, Math.min(10, Number(groupCount) || 1));
    socket.emit("admin_set_groups", count);
    alert("Налаштування груп збережено!");
  };

  const register = () => {
    if (!name.trim()) return alert("Введіть ім’я");
    socket.emit("register", { name, group }, (res) => {
      if (!res.ok) return alert(res.error);
      setRole(res.role);
    });
  };

  if (isAdminLogin && !role)
    return (
      <div style={{ padding: 20 }}>
        <h2>Вхід для Адміна</h2>
        <input placeholder="Логін" value={adminUser} onChange={(e) => setAdminUser(e.target.value)} />
        <input type="password" placeholder="Пароль" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} />
        <button onClick={adminLogin}>Увійти</button>
        {adminError && <p style={{ color: "red" }}>{adminError}</p>}
      </div>
    );

  if (!role)
    return (
      <div style={{ padding: 20 }}>
        <h2>Реєстрація гравця</h2>
        <input placeholder="Ваше ім’я" value={name} onChange={(e) => setName(e.target.value)} />
        <select value={group} onChange={(e) => setGroup(Number(e.target.value))}>
          {Array.from({ length: groupCount }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Група {i + 1}
            </option>
          ))}
        </select>
        <button onClick={register}>Увійти</button>
        <button onClick={() => setIsAdminLogin(true)}>Вхід для Адміна</button>
      </div>
    );

  if (role === "admin")
    return (
      <div style={{ padding: 20 }}>
        <h2>Адмін-панель</h2>
        <input
          type="number"
          min="1
