import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER = import.meta.env.VITE_SERVER || "https://teamcommunicationgame.onrender.com";
const socket = io(SERVER, { autoConnect: false });

const ROLE_IMAGES = {
  A: "/cards/A.jpeg",
  B: "/cards/B.jpeg",
  C: "/cards/C.jpeg",
  D: "/cards/D.jpeg",
  E: "/cards/E.jpeg",
  F: "/cards/F.jpeg",
};

export default function App() {
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [group, setGroup] = useState(1);
  const [groupCount, setGroupCount] = useState(parseInt(import.meta.env.VITE_GROUPS || 1));
  const [card, setCard] = useState("");
  const [messages, setMessages] = useState({});
  const [reply, setReply] = useState({});
  const [guess, setGuess] = useState("");

  useEffect(() => {
    socket.connect();
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("card", ({ role, card }) => {
      setRole(role);
      setCard(card);
    });

    socket.on("private_message", ({ from, name: fromName, text }) => {
      setMessages((m) => ({
        ...m,
        [from]: [...(m[from] || []), { fromName, text }],
      }));
    });

    socket.on("game_result", ({ message }) => alert(message));
  }, []);

  const register = () => {
    if (!name.trim()) return alert("Введіть ім’я");
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
        [toRole]: [...(m[toRole] || []), { fromName: name, text }],
      }));
      setReply((r) => ({ ...r, [toRole]: "" }));
    });
  };

  const submitGuess = () => {
    if (!guess.trim()) return alert("Введіть відповідь");
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

  const inputStyle = {
    width: "100%",
    padding: 8,
    borderRadius: 6,
    border: "1px solid #ccc",
    marginBottom: 8,
  };

  const buttonStyle = {
    padding: "8px 12px",
    borderRadius: 6,
    border: "none",
    background: "#4f8ef7",
    color: "#fff",
    cursor: "pointer",
    marginTop: 4,
  };

  // --- Форма реєстрації ---
  if (!role) {
    return (
      <div style={{ ...containerStyle, textAlign: "center" }}>
        <h2>Реєстрація гравця</h2>
        <input placeholder="Ваше ім’я" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        <br />
        <select value={group} onChange={(e) => setGroup(Number(e.target.value))} style={{ padding: 8, borderRadius: 6, marginBottom: 12 }}>
          {Array.from({ length: groupCount }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Група {i + 1}
            </option>
          ))}
        </select>
        <br />
        <button style={buttonStyle} onClick={register}>Увійти</button>
      </div>
    );
  }

  // --- Інтерфейс гравця ---
  return (
    <div style={containerStyle}>
      <h2>👋 Вітаємо, {name}! Ваша роль: {role}</h2>
      <p>Вибрана група: {group}</p>
      <img src={ROLE_IMAGES[role]} alt={`Card ${role}`} style={{ maxWidth: "100%", marginBottom: 16 }} />

      {role !== "B" && (
        <div>
          <h3>Повідомлення до B</h3>
          <div style={{ border: "1px solid #ccc", padding: 8, maxHeight: 150, overflowY: "auto" }}>
            {(messages["B"] || []).map((m, i) => (
              <div key={i} style={{ fontSize: "0.85rem", marginBottom: 2 }}>
                <strong>{m.fromName}:</strong> {m.text}
              </div>
            ))}
          </div>
          <textarea
            style={{ ...inputStyle, height: 60 }}
            placeholder="Ваше повідомлення"
            value={reply["B"] || ""}
            onChange={(e) => setReply({ ...reply, B: e.target.value })}
          />
          <button style={buttonStyle} onClick={() => sendMessage("B")}>Надіслати B</button>
        </div>
      )}

      {role === "B" && (
        <div>
          <h3>Повідомлення від усіх гравців</h3>
          {["A", "C", "D", "E", "F"].map((r) => (
            <div key={r} style={{ border: "1px solid #ccc", marginTop: 8, padding: 6 }}>
              <strong>{r}</strong>
              <div style={{ maxHeight: 120, overflowY: "auto", fontSize: "0.85rem" }}>
                {(messages[r] || []).map((m, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>
                    <strong>{m.fromName}:</strong> {m.text}
                  </div>
                ))}
              </div>
              <textarea
                style={{ ...inputStyle, height: 60 }}
                placeholder={`Відповідь ${r}`}
                value={reply[r] || ""}
                onChange={(e) => setReply({ ...reply, [r]: e.target.value })}
              />
              <button style={buttonStyle} onClick={() => sendMessage(r)}>Надіслати</button>
            </div>
          ))}
        </div>
      )}

      {role === "C" && (
        <div style={{ marginTop: 16 }}>
          <h3>Відправити остаточну відповідь</h3>
          <input style={inputStyle} placeholder="Спільна фігура" value={guess} onChange={(e) => setGuess(e.target.value)} />
          <button style={buttonStyle} onClick={submitGuess}>Надіслати</button>
        </div>
      )}
    </div>
  );
}
