import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER =
  import.meta.env.VITE_SERVER || "https://teamcommunicationgame.onrender.com";
const socket = io(SERVER);

export default function App() {
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [group, setGroup] = useState(1);
  const [groupCount, setGroupCount] = useState(1);
  const [messages, setMessages] = useState({});
  const [reply, setReply] = useState({});

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("group_count", (count) => setGroupCount(count));
    socket.on("card", ({ role }) => setRole(role));
    socket.on("private_message", ({ from, name: senderName, text }) => {
      setMessages((m) => ({
        ...m,
        [from]: [...(m[from] || []), { from, name: senderName, text }],
      }));
    });
    socket.on("game_result", ({ message }) => alert(message));

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("group_count");
      socket.off("card");
      socket.off("private_message");
      socket.off("game_result");
    };
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

  // Форма реєстрації
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
          {Array.from({ length: groupCount }, (_, i) => (
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

  // Інтерфейс гравця
  return (
    <div style={containerStyle}>
      <h2>👋 Вітаємо, {name}! Ваша роль: {role}</h2>
      <p>Вибрана група: {group}</p>
      {/* Відображення картки */}
      <img
        src={`/cards/${role}.jpeg`}
        alt={`Картка ${role}`}
        style={{ width: 200, marginBottom: 20 }}
      />

      {role !== "B" ? (
        <div>
          <h3>Повідомлення до B</h3>
          <div
            style={{
              border: "1px solid #ccc",
              padding: 10,
              minHeight: 60,
              marginBottom: 8,
              maxHeight: 150,
              overflowY: "auto",
            }}
          >
            {(messages["B"] || []).map((m, i) => (
              <div key={i}>
                <strong>{m.name}:</strong> {m.text}
              </div>
            ))}
          </div>
          <textarea
            rows={3}
            placeholder="Ваше повідомлення"
            value={reply["B"] || ""}
            onChange={(e) => setReply({ ...reply, B: e.target.value })}
            style={{ width: "100%", marginBottom: 8, borderRadius: 6 }}
          />
          <button style={buttonStyle} onClick={() => sendMessage("B")}>
            Надіслати B
          </button>
        </div>
      ) : (
        <div>
          <h3>Вхідні повідомлення від усіх</h3>
          {["A", "C", "D", "E", "F"].map((r) => (
            <div
              key={r}
              style={{
                border: "1px solid #ccc",
                marginTop: 8,
                padding: 8,
                borderRadius: 6,
              }}
            >
              <strong>{r}</strong>
              <div
                style={{
                  maxHeight: 120,
                  overflowY: "auto",
                  fontSize: "0.85rem",
                  lineHeight: 1.2,
                }}
              >
                {(messages[r] || []).map((m, i) => (
                  <div
                    key={i}
                    style={{
                      textAlign: m.from === "me" ? "right" : "left",
                      margin: "2px 0",
                      padding: "2px 4px",
                      borderRadius: 4,
                      background: m.from === "me" ? "#4f8ef7" : "#eee",
                      color: m.from === "me" ? "#fff" : "#000",
                    }}
                  >
                    {m.text}
                  </div>
                ))}
              </div>
              <textarea
                rows={3}
                placeholder={`Відповідь ${r}`}
                value={reply[r] || ""}
                onChange={(e) => setReply({ ...reply, [r]: e.target.value })}
                style={{ width: "100%", marginTop: 4, borderRadius: 6 }}
              />
              <button style={buttonStyle} onClick={() => sendMessage(r)}>
                Надіслати
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
