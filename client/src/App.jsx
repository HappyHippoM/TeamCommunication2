import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER =
  import.meta.env.VITE_SERVER || "https://teamcommunicationgame.onrender.com";
const socket = io(SERVER);

export default function App() {
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState({});
  const [reply, setReply] = useState({});
  const [guess, setGuess] = useState("");

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("card", ({ role }) => setRole(role));
    socket.on("players", (list) => setPlayers(list));

    socket.on("private_message", ({ from, name, text }) => {
      setMessages((m) => ({
        ...m,
        [from]: [...(m[from] || []), { from, name, text }],
      }));
    });

    socket.on("game_result", ({ message }) => alert(message));
  }, []);

  const register = () => {
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

  const submitGuess = () => {
    socket.emit("submit_answer", { answer: guess }, (res) => {
      if (!res.ok) alert(res.error);
      else alert("Відповідь відправлена!");
    });
  };

  const getCardImage = () => {
    if (!role) return "";
    return `/cards/${role}.jpg`;
  };

  // --- стилі повідомлень ---
  const chatContainerStyle = {
    border: "1px solid #ccc",
    borderRadius: 10,
    padding: 10,
    minHeight: 120,
    maxHeight: 250,
    overflowY: "auto",
    background: "#f8f9fa",
  };

  const messageStyle = (isMine) => ({
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 10,
    marginBottom: 4,
    maxWidth: "80%",
    wordWrap: "break-word",
    fontSize: "0.9rem",
    lineHeight: "1.2rem",
    color: isMine ? "#fff" : "#222",
    background: isMine ? "#4f8ef7" : "#e5e5ea",
    alignSelf: isMine ? "flex-end" : "flex-start",
  });

  if (!role)
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <h2>Реєстрація</h2>
        <input
          placeholder="Ваше ім’я"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            padding: "8px",
            borderRadius: 6,
            border: "1px solid #ccc",
            marginRight: 8,
          }}
        />
        <button
          onClick={register}
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "none",
            background: "#4f8ef7",
            color: "white",
            cursor: "pointer",
          }}
        >
          Увійти
        </button>
      </div>
    );

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 700,
        margin: "0 auto",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center" }}>
        👋 Вітаємо, {name}! <br />
        Ваша роль: <b>{role}</b>
      </h2>

      <div style={{ marginBottom: 20, textAlign: "center" }}>
        <img
          src={getCardImage()}
          alt={`Картка ${role}`}
          style={{
            maxWidth: "80%",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        />
      </div>

      {role !== "B" ? (
        <div>
          <h3>Чат з гравцем B</h3>
          <div style={chatContainerStyle}>
            {(messages["B"] || []).map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    m.from === "me" ? "flex-end" : "flex-start",
                }}
              >
                <div style={messageStyle(m.from === "me")}>
                  {m.from === "me" ? "Ви: " : `${m.name} (B): `}
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <textarea
            placeholder="Ваше повідомлення..."
            rows={3}
            style={{
              width: "100%",
              resize: "none",
              marginTop: 8,
              borderRadius: 8,
              padding: 8,
              border: "1px solid #ccc",
              fontSize: "0.9rem",
            }}
            value={reply["B"] || ""}
            onChange={(e) => setReply({ ...reply, B: e.target.value })}
          />
          <button
            onClick={() => sendMessage("B")}
            style={{
              marginTop: 6,
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              background: "#4f8ef7",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Надіслати
          </button>
        </div>
      ) : (
        <div>
          <h3>Вхідні повідомлення</h3>
          {["A", "C", "D", "E", "F"].map((r) => (
            <div
              key={r}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                marginTop: 12,
                padding: 10,
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <strong>{r}</strong>
              <div style={chatContainerStyle}>
                {(messages[r] || []).map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent:
                        m.from === "me" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div style={messageStyle(m.from === "me")}>
                      {m.from === "me" ? "Ви: " : `${m.name} (${r}): `}
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <textarea
                placeholder={`Відповідь ${r}...`}
                rows={3}
                style={{
                  width: "100%",
                  resize: "none",
                  marginTop: 8,
                  borderRadius: 8,
                  padding: 8,
                  border: "1px solid #ccc",
                  fontSize: "0.9rem",
                }}
                value={reply[r] || ""}
                onChange={(e) => setReply({ ...reply, [r]: e.target.value })}
              />
              <button
                onClick={() => sendMessage(r)}
                style={{
                  marginTop: 6,
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "none",
                  background: "#4f8ef7",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Надіслати {r}
              </button>
            </div>
          ))}
        </div>
      )}

      {role === "C" && (
        <div style={{ marginTop: 20 }}>
          <h3>Відправити остаточну відповідь</h3>
          <input
            placeholder="Спільна фігура"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 8,
              border: "1px solid #ccc",
              width: "100%",
              maxWidth: 300,
            }}
          />
          <button
            onClick={submitGuess}
            style={{
              marginTop: 6,
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              background: "#4f8ef7",
              color: "#fff",
              cursor: "pointer",
              marginLeft: 10,
            }}
          >
            Надіслати відповідь
          </button>
        </div>
      )}
    </div>
  );
}
