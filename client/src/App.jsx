import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER = import.meta.env.VITE_SERVER || "https://teamcommunicationgame.onrender.com";
const GROUP_COUNT = parseInt(import.meta.env.VITE_GROUP_COUNT) || 1; // кількість груп з .env
const socket = io(SERVER);

const ROLES = ["A", "B", "C", "D", "E", "F"];

export default function App() {
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [group, setGroup] = useState(1);
  const [messages, setMessages] = useState({});
  const [reply, setReply] = useState({});

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("card", ({ role }) => setRole(role));
    socket.on("private_message", ({ from, name: fromName, text }) => {
      setMessages((m) => ({
        ...m,
        [from]: [...(m[from] || []), { from, name: fromName, text }],
      }));
    });

    socket.on("game_result", ({ message }) => alert(message));
  }, []);

  const register = () => {
    if (!name.trim()) return alert("Введіть ім'я");
    socket.emit("register", { name, group }, (res) => {
      if (!res.ok) return alert(res.error);
      setRole(res.role);
    });
  };

  const sendMessage = (toRole) => {
    const text = reply[toRole];
    if (!text) return;
    socket.emit("send_message", { toRole, text }, (res) => {
      if (!res.ok) return alert(res.error);
      setMessages((m) => ({
        ...m,
        [toRole]: [...(m[toRole] || []), { from: "me", name, text }],
      }));
      setReply((r) => ({ ...r, [toRole]: "" }));
    });
  };

  const containerStyle = {
    padding: 16,
    margin: "0 auto",
    maxWidth: 700,
    fontFamily: "Inter, sans-serif",
  };

  const buttonStyle = {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#4f8ef7",
    color: "white",
    cursor: "pointer",
    fontSize: "0.9rem",
    marginTop: 8,
  };

  // --- Форма реєстрації ---
  if (!role) {
    return (
      <div style={{ ...containerStyle, textAlign: "center" }}>
        <h2>Реєстрація гравця</h2>
        <input
          placeholder="Ваше ім’я"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            width: "80%",
            maxWidth: 300,
            marginBottom: 8,
          }}
        />
        <br />
        <select
          value={group}
          onChange={(e) => setGroup(Number(e.target.value))}
          style={{ padding: 8, borderRadius: 6, marginBottom: 12 }}
        >
          {Array.from({ length: GROUP_COUNT }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Група {i + 1}
            </option>
          ))}
        </select>
        <br />
        <button style={buttonStyle} onClick={register}>
          Увійти
        </button>
      </div>
    );
  }

  // --- Інтерфейс гравця ---
  return (
    <div style={containerStyle}>
      <h2>👋 Вітаємо, {name}! Ваша роль: {role}</h2>
      <p>Вибрана група: {group}</p>
      <div>
        <img
          src={`/cards/${role}.jpeg`}
          alt={`Картка ${role}`}
          style={{ width: "100%", maxWidth: 300, borderRadius: 12 }}
        />
      </div>

      {role !== "B" && (
        <div style={{ marginTop: 20 }}>
          <h3>Повідомлення до B</h3>
          <div
            style={{
              border: "1px solid #ccc",
              padding: 10,
              minHeight: 60,
              maxHeight: 100,
              overflowY: "auto",
            }}
          >
            {(messages["B"] || []).map((m, i) => (
              <div
                key={i}
                style={{
                  background: m.from === "B" ? "#eee" : "#4f8ef7",
                  color: m.from === "B" ? "#000" : "#fff",
                  padding: "4px 8px",
                  borderRadius: 6,
                  marginBottom: 2,
                  fontSize: 14,
                  lineHeight: "16px",
                }}
              >
                {m.from === "B" ? `${m.name}: ${m.text}` : `Ви: ${m.text}`}
              </div>
            ))}
          </div>
          <textarea
            placeholder="Ваше повідомлення"
            value={reply["B"] || ""}
            onChange={(e) => setReply({ ...reply, B: e.target.value })}
            style={{
              width: "100%",
              maxWidth: 300,
              height: 60,
              marginTop: 4,
              padding: 6,
              borderRadius: 6,
              resize: "none",
            }}
          />
          <br />
          <button style={buttonStyle} onClick={() => sendMessage("B")}>
            Надіслати B
          </button>
        </div>
      )}
    </div>
  );
}
