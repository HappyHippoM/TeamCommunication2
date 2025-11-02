import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

// SERVER і кількість груп беремо з .env
const SERVER = import.meta.env.VITE_SERVER;
const GROUP_COUNT = parseInt(import.meta.env.VITE_GROUP_COUNT) || 1;

const ROLES = ["A", "B", "C", "D", "E", "F"];

export default function App() {
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [group, setGroup] = useState(1);
  const [messages, setMessages] = useState({});
  const [reply, setReply] = useState({});
  const [guess, setGuess] = useState("");

  const socket = io(SERVER);

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

    return () => socket.disconnect();
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
      <div style={{ padding: 20, textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
        <h2>Реєстрація гравця</h2>
        <input
          placeholder="Ваше ім’я"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 10, width: "80%", borderRadius: 6, border: "1px solid #ccc", marginBottom: 8 }}
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
        <button
          onClick={register}
          style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#4f8ef7", color: "#fff", cursor: "pointer" }}
        >
          Увійти
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <h2>👋 Вітаємо, {name}! Ваша роль: {role}</h2>
      <p>Вибрана група: {group}</p>

      {role !== "B" && (
        <div style={{ marginTop: 20 }}>
          <h3>Повідомлення до B</h3>
          <div style={{ border: "1px solid #ccc", padding: 10, minHeight: 60 }}>
            {(messages["B"] || []).map((m, i) => (
              <div key={i}>
                <strong>{m.from}: </strong>
                {m.text}
              </div>
            ))}
          </div>
          <textarea
            value={reply["B"] || ""}
            onChange={(e) => setReply({ ...reply, B: e.target.value })}
            style={{ width: "100%", height: 60, marginTop: 4, padding: 6 }}
          />
          <button onClick={() => sendMessage("B")} style={{ marginTop: 4, padding: "6px 12px" }}>
            Надіслати
          </button>
        </div>
      )}

      {role === "B" && (
        <div style={{ marginTop: 20 }}>
          <h3>Вхідні повідомлення від інших</h3>
          {ROLES.filter((r) => r !== "B").map((r) => (
            <div key={r} style={{ border: "1px solid #ccc", padding: 8, marginBottom: 6 }}>
              <strong>{r}</strong>
              <div>
                {(messages[r] || []).map((m, i) => (
                  <div key={i}>
                    <strong>{m.from}: </strong>
                    {m.text}
                  </div>
                ))}
              </div>
              <textarea
                value={reply[r] || ""}
                onChange={(e) => setReply({ ...reply, [r]: e.target.value })}
                style={{ width: "100%", height: 60, marginTop: 4, padding: 6 }}
              />
              <button onClick={() => sendMessage(r)} style={{ marginTop: 4, padding: "6px 12px" }}>
                Надіслати
              </button>
            </div>
          ))}
        </div>
      )}

      {role === "C" && (
        <div style={{ marginTop: 20 }}>
          <h3>Відправити спільну відповідь</h3>
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Спільна фігура"
            style={{ padding: 6, width: "50%", marginRight: 6 }}
          />
          <button onClick={submitGuess} style={{ padding: "6px 12px" }}>
            Надіслати
          </button>
        </div>
      )}
    </div>
  );
}
