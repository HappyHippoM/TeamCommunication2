import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER =
  import.meta.env.VITE_SERVER || "https://teamcommunicationgame.onrender.com";
const socket = io(SERVER);

const ROLES = ["A", "B", "C", "D", "E", "F"];

export default function App() {
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [card, setCard] = useState("");
  const [messages, setMessages] = useState({});
  const [reply, setReply] = useState({});

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("card", ({ role }) => {
      setRole(role);
      setCard(`${role}.jpg`);
    });

    socket.on("private_message", ({ from, name: senderName, text }) => {
      setMessages((m) => ({
        ...m,
        [from]: [...(m[from] || []), { from, name: senderName, text }],
      }));
    });

    socket.on("game_result", ({ message }) => alert(message));
  }, []);

  const register = () => {
    if (!name.trim()) return alert("Введіть ім'я");
    socket.emit("register", { name }, (res) => {
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
    padding: "8px 14px",
    borderRadius: 6,
    border: "none",
    background: "#4f8ef7",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.9rem",
    marginTop: 8,
  };

  // --- Форма реєстрації ---
  if (!role) {
    return (
      <div style={{ ...containerStyle, textAlign: "center" }}>
        <h2>Реєстрація</h2>
        <input
          placeholder="Ваше ім'я"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 6,
            border: "1px solid #ccc",
            width: "80%",
            maxWidth: 300,
            marginBottom: 8,
          }}
        />
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
      <div style={{ marginBottom: 16 }}>
        <h3>Ваша картка:</h3>
        <img
          src={`/cards/${card}`}
          alt={`Картка ${role}`}
          style={{ maxWidth: "100%", height: "auto", borderRadius: 8 }}
        />
      </div>

      {role !== "B" ? (
        <div>
          <h3>Повідомлення для B</h3>
          <div
            style={{
              border: "1px solid #ccc",
              borderRadius: 6,
              padding: 8,
              minHeight: 80,
              maxHeight: 150,
              overflowY: "auto",
              marginBottom: 8,
            }}
          >
            {(messages["B"] || []).map((m, i) => (
              <div
                key={i}
                style={{
                  textAlign: m.from === "me" ? "right" : "left",
                  marginBottom: 4,
                  fontSize: 14,
                  lineHeight: 1.2,
                }}
              >
                {m.from !== "me" && <strong>{m.name}: </strong>}
                {m.text}
              </div>
            ))}
          </div>
          <textarea
            rows={3}
            placeholder="Ваше повідомлення"
            value={reply["B"] || ""}
            onChange={(e) => setReply({ ...reply, B: e.target.value })}
            style={{ width: "100%", padding: 6, borderRadius: 6 }}
          />
          <button style={buttonStyle} onClick={() => sendMessage("B")}>
            Надіслати B
          </button>
        </div>
      ) : (
        <div>
          <h3>Вхідні повідомлення від інших</h3>
          {ROLES.filter((r) => r !== "B").map((r) => (
            <div
              key={r}
              style={{
                border: "1px solid #ccc",
                borderRadius: 6,
                padding: 8,
                marginBottom: 12,
              }}
            >
              <strong>{r}</strong>
              <div
                style={{
                  maxHeight: 120,
                  overflowY: "auto",
                  marginTop: 4,
                }}
              >
                {(messages[r] || []).map((m, i) => (
                  <div
                    key={i}
                    style={{
                      textAlign: m.from === "me" ? "right" : "left",
                      fontSize: 13,
                      lineHeight: 1.2,
                      marginBottom: 2,
                    }}
                  >
                    {m.from !== "me" && <strong>{m.name}: </strong>}
                    {m.text}
                  </div>
                ))}
              </div>
              <textarea
                rows={3}
                placeholder={`Відповідь ${r}`}
                value={reply[r] || ""}
                onChange={(e) => setReply({ ...reply, [r]: e.target.value })}
                style={{ width: "100%", padding: 6, borderRadius: 6 }}
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
