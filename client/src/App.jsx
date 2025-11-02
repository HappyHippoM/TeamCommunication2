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

    socket.on("card", ({ role }) => {
      setRole(role);
    });

    socket.on("players", (list) => {
      setPlayers(list);
    });

    socket.on("private_message", ({ from, name, text }) => {
      setMessages((m) => ({
        ...m,
        [from]: [...(m[from] || []), `${name} (${from}): ${text}`],
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
        [toRole]: [...(m[toRole] || []), `Ви: ${text}`],
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

  if (!role)
    return (
      <div style={{ padding: 20 }}>
        <h2>Реєстрація</h2>
        <input
          placeholder="Ваше ім’я"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={register}>Увійти</button>
      </div>
    );

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: "0 auto" }}>
      <h2>
        Вітаємо, {name}! Ваша роль: <b>{role}</b>
      </h2>
      <div style={{ marginBottom: 20 }}>
        <img
          src={getCardImage()}
          alt={`Картка ${role}`}
          style={{
            maxWidth: "100%",
            borderRadius: 10,
            boxShadow: "0 0 10px rgba(0,0,0,0.2)",
          }}
        />
      </div>

      {role !== "B" ? (
        // Учасники A, C, D, E, F — можуть писати тільки до B
        <div style={{ marginTop: 20 }}>
          <h3>Повідомлення до гравця B</h3>
          <div
            style={{
              border: "1px solid #ccc",
              padding: 10,
              minHeight: 80,
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {(messages["B"] || []).map((m, i) => (
              <div key={i}>{m}</div>
            ))}
          </div>
          <textarea
            placeholder="Ваше повідомлення"
            rows={3}
            style={{
              width: "100%",
              resize: "none",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              marginTop: 6,
            }}
            value={reply["B"] || ""}
            onChange={(e) =>
              setReply({
                ...reply,
                B: e.target.value,
              })
            }
          />
          <button onClick={() => sendMessage("B")}>Надіслати B</button>
        </div>
      ) : (
        // Гравець B бачить чати всіх інших
        <div style={{ marginTop: 20 }}>
          <h3>Вхідні повідомлення</h3>
          {["A", "C", "D", "E", "F"].map((r) => (
            <div
              key={r}
              style={{
                border: "1px solid #ccc",
                marginTop: 10,
                padding: 8,
                borderRadius: 8,
              }}
            >
              <strong>{r}</strong>
              <div
                style={{
                  maxHeight: 150,
                  overflowY: "auto",
                  marginTop: 4,
                }}
              >
                {(messages[r] || []).map((m, i) => (
                  <div key={i}>{m}</div>
                ))}
              </div>
              <textarea
                placeholder={`Відповідь ${r}`}
                rows={3}
                style={{
                  width: "100%",
                  resize: "none",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  marginTop: 6,
                }}
                value={reply[r] || ""}
                onChange={(e) =>
                  setReply({
                    ...reply,
                    [r]: e.target.value,
                  })
                }
              />
              <button onClick={() => sendMessage(r)}>
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
          />
          <button onClick={submitGuess}>Надіслати відповідь</button>
        </div>
      )}
    </div>
  );
}
