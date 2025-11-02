import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER = import.meta.env.VITE_SERVER || "http://localhost:4000";
const GROUP_COUNT = parseInt(import.meta.env.VITE_GROUP_COUNT) || 1;

const CARD_IMAGES = {
  A: "/cards/A.jpg",
  B: "/cards/B.jpg",
  C: "/cards/C.jpg",
  D: "/cards/D.jpg",
  E: "/cards/E.jpg",
  F: "/cards/F.jpg",
};

const socket = io(SERVER);

export default function App() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [group, setGroup] = useState(1);
  const [messages, setMessages] = useState({});
  const [reply, setReply] = useState({});
  const [guess, setGuess] = useState("");

  useEffect(() => {
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

  if (!role) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <h2>Реєстрація гравця</h2>
        <input
          placeholder="Ваше ім’я"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 10, borderRadius: 6, width: "80%", maxWidth: 300 }}
        />
        <br />
        <select
          value={group}
          onChange={(e) => setGroup(Number(e.target.value))}
          style={{ padding: 8, borderRadius: 6, marginTop: 12 }}
        >
          {Array.from({ length: GROUP_COUNT }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Група {i + 1}
            </option>
          ))}
        </select>
        <br />
        <button
          onClick={register}
          style={{
            marginTop: 12,
            padding: "10px 16px",
            borderRadius: 6,
            background: "#4f8ef7",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Увійти
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>👋 Вітаємо, {name}!</h2>
      <p>Ваша група: {group}</p>
      <p>Ваша роль: {role}</p>
      <div style={{ marginTop: 20 }}>
        <img
          src={CARD_IMAGES[role]}
          alt={`Card ${role}`}
          style={{ maxWidth: "300px", width: "100%", borderRadius: 8 }}
        />
      </div>

      {/* Повідомлення */}
      {role !== "B" ? (
        <div style={{ marginTop: 20 }}>
          <h3>Повідомлення до B</h3>
          <div style={{ minHeight: 80, border: "1px solid #ccc", padding: 8 }}>
            {(messages["B"] || []).map((m, i) => (
              <div key={i}>
                <strong>{m.name}:</strong> {m.text}
              </div>
            ))}
          </div>
          <textarea
            value={reply["B"] || ""}
            onChange={(e) => setReply({ ...reply, B: e.target.value })}
            rows={3}
            style={{ width: "100%", marginTop: 8 }}
          />
          <button onClick={() => sendMessage("B")} style={{ marginTop: 8 }}>
            Надіслати B
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 20 }}>
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
              <div>
                {(messages[r] || []).map((m, i) => (
                  <div key={i}>
                    <strong>{m.name}:</strong> {m.text}
                  </div>
                ))}
              </div>
              <textarea
                placeholder={`Відповідь ${r}`}
                value={reply[r] || ""}
                onChange={(e) => setReply({ ...reply, [r]: e.target.value })}
                rows={3}
                style={{ width: "100%", marginTop: 4 }}
              />
              <button onClick={() => sendMessage(r)} style={{ marginTop: 4 }}>
                Надіслати
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Відправка остаточної відповіді тільки для C */}
      {role === "C" && (
        <div style={{ marginTop: 20 }}>
          <h3>Відправити остаточну відповідь</h3>
          <input
            placeholder="Спільна фігура"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            style={{ padding: 8, width: "100%", marginTop: 4 }}
          />
          <button onClick={submitGuess} style={{ marginTop: 8 }}>
            Надіслати відповідь
          </button>
        </div>
      )}
    </div>
  );
}
