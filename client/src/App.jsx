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
  const [group, setGroup] = useState(1);
  const [groupCount, setGroupCount] = useState(
    Number(import.meta.env.VITE_GROUPS) || 1
  );
  const [messages, setMessages] = useState({});
  const [reply, setReply] = useState({});
  const [guess, setGuess] = useState("");

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("group_count", (count) => setGroupCount(count));
    socket.on("card", ({ role }) => setRole(role));

    socket.on("private_message", ({ from, name, text }) => {
      setMessages((m) => ({
        ...m,
        [from]: [...(m[from] || []), { from, name, text }],
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

  const submitGuess = () => {
    socket.emit("submit_answer", { answer: guess }, (res) => {
      if (!res.ok) alert(res.error);
      else alert("Відповідь відправлена!");
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

  // --- Форма реєстрації гравців ---
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

  // --- Інтерфейс гравця ---
  return (
    <div style={containerStyle}>
      <h2>👋 Вітаємо, {name}! Ваша роль: {role}</h2>
      <p>Вибрана група: {group}</p>

      <div style={{ margin: "20px 0" }}>
        <img
          src={`/cards/${role}.jpeg`}
          alt={`Картка ${role}`}
          style={{ width: 150, height: 150, borderRadius: 8 }}
        />
      </div>

      {role !== "B" ? (
        <div>
          <h3>Повідомлення до B</h3>
          <div
            style={{
              border: "1px solid #ccc",
              padding: 10,
              minHeight: 60,
              marginBottom: 8,
            }}
          >
            {(messages["B"] || []).map((m, i) => (
              <div key={i}>
                <b>{m.name}:</b> {m.text}
              </div>
            ))}
          </div>
          <textarea
            value={reply["B"] || ""}
            onChange={(e) => setReply({ ...reply, B: e.target.value })}
            rows={3}
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
                marginTop: 8,
                padding: 8,
                borderRadius: 6,
              }}
            >
              <strong>{r}</strong>
              <div>
                {(messages[r] || []).map((m, i) => (
                  <div key={i}>
                    <b>{m.name}:</b> {m.text}
                  </div>
                ))}
              </div>
              <textarea
                rows={3}
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
