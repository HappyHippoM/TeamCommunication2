import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER = import.meta.env.VITE_SERVER || "https://teamcommunicationgame.onrender.com";
const socket = io(SERVER);

export default function App() {
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [group, setGroup] = useState(1);
  const [groupCount, setGroupCount] = useState(1);
  const [messages, setMessages] = useState({});
  const [reply, setReply] = useState({});
  const [guess, setGuess] = useState("");
  const [card, setCard] = useState([]);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    socket.on("group_count", (count) => setGroupCount(count));
    socket.on("card", ({ role, card }) => { setRole(role); setCard(card); });
    socket.on("private_message", ({ from, name: senderName, text }) => {
      setMessages((m) => ({ ...m, [from]: [...(m[from] || []), { from, name: senderName, text }] }));
    });
    socket.on("game_result", ({ message }) => alert(message));
  }, []);

  const register = () => {
    if (!name.trim()) return alert("Введіть ім'я");
    socket.emit("register", { name, group }, (res) => {
      if (!res.ok) return alert(res.error);
      setRole(res.role);
      setCard([`${res.role}.jpeg`]);
    });
  };

  const sendMessage = (toRole) => {
    const text = reply[toRole];
    if (!text) return;
    socket.emit("send_message", { toRole, text }, (res) => {
      if (!res.ok) return alert(res.error);
      setMessages((m) => ({
        ...m,
        [toRole]: [...(m[toRole] || []), { from: "me", name, text }]
      }));
      setReply((r) => ({ ...r, [toRole]: "" }));
    });
  };

  const submitGuess = () => {
    socket.emit("submit_answer", { answer: guess }, (res) => {
      if (!res.ok) alert(res.error);
      else alert("Відповідь відправлена!");
    });
  };

  const adminLogin = () => {
    setAdminError("");
    socket.emit("admin_login", { user: adminUser, pass: adminPass }, (res) => {
      if (!res.ok) return setAdminError(res.error);
      setRole("admin");
    });
  };

  const setGroupsAdmin = () => {
    const count = parseInt(groupCount);
    if (!count || count < 1 || count > 10) return alert("1–10 груп");
    socket.emit("admin_set_groups", count);
    alert("Налаштування груп збережено!");
  };

  const containerStyle = { padding: 16, margin: "0 auto", maxWidth: 700, fontFamily: "Inter, sans-serif" };
  const buttonStyle = { padding: "10px 16px", borderRadius: 8, border: "none", background: "#4f8ef7", color: "white", cursor: "pointer", fontSize: "0.9rem", marginTop: 8 };

  // --- Вхід для адміна ---
  if (isAdminLogin && !role) {
    return (
      <div style={containerStyle}>
        <h2>Вхід для адміністратора</h2>
        <input placeholder="Логін" value={adminUser} onChange={(e) => setAdminUser(e.target.value)} style={{ padding: 8, borderRadius: 6, width: "100%", maxWidth: 300, marginBottom: 8 }} />
        <input type="password" placeholder="Пароль" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} style={{ padding: 8, borderRadius: 6, width: "100%", maxWidth: 300, marginBottom: 8 }} />
        <br />
        <button style={buttonStyle} onClick={adminLogin}>Увійти</button>
        {adminError && <p style={{ color: "red" }}>{adminError}</p>}
      </div>
    );
  }

  // --- Форма реєстрації гравців ---
  if (!role) {
    return (
      <div style={{ ...containerStyle, textAlign: "center" }}>
        <h2>Реєстрація гравця</h2>
        <input placeholder="Ваше ім’я" value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc", width: "80%", max
