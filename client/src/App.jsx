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
  const [guess, setGuess] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

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
    if (name.trim() === "") return alert("Введіть ім'я");
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

  const setGroupsAdmin = (count) => {
    socket.emit("admin_set_groups", count);
  };

  const getCardImage = () => (role ? `/cards/${role}.jpg` : "");

  const chatContainerStyle = {
    border: "1px solid #ccc",
    borderRadius: 10,
    padding: 10,
    minHeight: 100,
    maxHeight: 250,
    overflowY: "auto",
    background: "#f8f9fa",
  };

  const messageStyle = (isMine) => ({
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 10,
    marginBottom: 4,
    maxWidth: "75%",
    wordWrap: "break-word",
    fontSize: "0.9rem",
    lineHeight: "1.2rem",
    color: isMine ? "#fff" : "#222",
    background: isMine ? "#4f8ef7" : "#e5e5ea",
    alignSelf: isMine ? "flex-end" : "flex-start",
  });

  const containerStyle = { padding: 16, margin: "0 auto", maxWidth: 700, fontFamily: "Inter, sans-serif" };
  const buttonStyle = { padding: "10px 16px", borderRadius: 8, border: "none", background: "#4f8ef7", color: "white", cursor: "pointer", fontSize: "0.9rem" };

  if (!role && !isAdmin)
    return (
      <div style={{ ...containerStyle, textAlign: "center" }}>
        <h2>Реєстрація</h2>
        <input
          placeholder="Ваше ім’я"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc", width: "80%", maxWidth: 300, marginBottom: 8 }}
        />
        <br />
        <select value={group} onChange={(e) => setGroup(Number(e.target.value))} style={{ padding: 8, borderRadius: 6, marginBottom: 12 }}>
          {Array.from({ length: groupCount }, (_, i) => (
            <option key={i + 1} value={i + 1}>Група {i + 1}</option>
          ))}
        </select>
        <br />
        <button style={buttonStyle} onClick={register}>Увійти</button>
        <button style={{ ...buttonStyle, marginTop: 10, background: "#222" }} onClick={() => setIsAdmin(true)}>Вхід як Адмін</button>
      </div>
    );

  if (isAdmin)
    return (
      <div style={containerStyle}>
        <h2>Адмін-панель</h2>
        <p>Встановіть кількість груп (1–10):</p>
        <input type="number" min="1" max="10" value={groupCount} onChange={(e) => setGroupsAdmin(e.target.value)} style={{ padding: 8, borderRadius: 6, width: 80 }} />
        <p>Поточна кількість груп: {groupCount}</p>
      </div>
    );

  return (
    <div style={containerStyle}>
      <h2 style={{ textAlign: "center" }}>👋 Вітаємо, {name}! <br />Ваша роль: <b>{role}</b></h2>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <img src={getCardImage()} alt={`Картка ${role}`} style={{ width: "100%", maxWidth: 400, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }} />
      </div>

      {role !== "B" ? (
        <div>
          <h3>Чат з гравцем B</h3>
          <div style={chatContainerStyle}>{(messages["B"] || []).map((m, i) => <div key={i} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start" }}><div style={messageStyle(m.from === "me")}>{m.from === "me" ? "Ви: " : `${m.name} (B): `}{m.text}</div></div>)}</div>
          <textarea placeholder="Ваше повідомлення..." rows={3} style={{ width: "100%", resize: "none", marginTop: 8, borderRadius: 8, padding: 8, border: "1px solid #ccc", fontSize: "0.9rem" }} value={reply["B"] || ""} onChange={(e) => setReply({ ...reply, B: e.target.value })} />
          <button style={buttonStyle} onClick={() => sendMessage("B")}>Надіслати</button>
        </div>
      ) : (
        <div>
          <h3>Вхідні повідомлення</h3>
          {["A", "C", "D", "E", "F"].map((r) => (
            <div key={r} style={{ border: "1px solid #ddd", borderRadius: 10, marginTop: 12, padding: 10, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <strong>{r}</strong>
              <div style={chatContainerStyle}>{(messages[r] || []).map((m, i) => <div key={i} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start" }}><div style={messageStyle(m.from === "me")}>{m.from === "me" ? "Ви: " : `${m.name} (${r}): `}{m.text}</div></div>)}</div>
              <textarea placeholder={`Відповідь ${r}...`} rows={3} style={{ width: "100%", resize: "none", marginTop: 8, borderRadius: 8, padding: 8, border: "1px solid #ccc", fontSize: "0.9rem" }} value={reply[r] || ""} onChange={(e) => setReply({ ...reply, [r]: e.target.value })} />
              <button style={buttonStyle} onClick={() => sendMessage(r)}>Надіслати {r}</button>
            </div>
          ))}
        </div>
      )}

      {role === "C" && (
        <div style={{ marginTop: 20 }}>
          <h3>Відправити остаточну відповідь</h3>
          <input placeholder="Спільна фігура" value={guess} onChange={(e) => setGuess(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc", width: "100%", maxWidth: 300, marginBottom: 8 }} />
          <br />
          <button style={buttonStyle} onClick={submitGuess}>Надіслати відповідь</button>
        </div>
      )}
    </div>
  );
}
