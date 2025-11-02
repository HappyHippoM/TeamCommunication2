import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER =
  import.meta.env.VITE_SERVER || "https://teamcommunicationgame.onrender.com";
const socket = io(SERVER, { transports: ["websocket", "polling"] });

const CARDS = {
  A: "/cards/A.jpg",
  B: "/cards/B.jpg",
  C: "/cards/C.jpg",
  D: "/cards/D.jpg",
  E: "/cards/E.jpg",
  F: "/cards/F.jpg",
};

export default function App() {
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [group, setGroup] = useState(1);
  const [groupCount, setGroupCount] = useState(1);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState("");
  const [isAdminLogin, setIsAdminLogin] = useState(false);

  useEffect(() => {
    socket.on("connect", () => console.log("🔗 Підключено"));
    socket.on("disconnect", () => console.log("❌ Відключено"));
    socket.on("group_count", (count) => setGroupCount(count));
    socket.on("card", ({ role }) => setRole(role));

    return () => socket.disconnect();
  }, []);

  const adminLogin = () => {
    setAdminError("");
    socket.emit(
      "admin_login",
      { user: adminUser, pass: adminPass },
      (res) => {
        if (!res.ok) return setAdminError(res.error);
        setRole("admin");
      }
    );
  };

  const setGroupsAdmin = () => {
    const count = Math.max(1, Math.min(10, Number(groupCount) || 1));
    socket.emit("admin_set_groups", count);
    alert("Налаштування груп збережено!");
  };

  const register = () => {
    if (!name.trim()) return alert("Введіть ім’я");
    socket.emit("register", { name, group }, (res) => {
      if (!res.ok) return alert(res.error);
      setRole(res.role);
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

  // --- Форма для входу адміністратора ---
  if (isAdminLogin && !role) {
    return (
      <div style={containerStyle}>
        <h2>Вхід для Адміна</h2>
        <input
          placeholder="Логін"
          value={adminUser}
          onChange={(e) => setAdminUser(e.target.value)}
          style={{ padding: 8, borderRadius: 6, width: "100%", marginBottom: 8 }}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={adminPass}
          onChange={(e) => setAdminPass(e.target.value)}
          style={{ padding: 8, borderRadius: 6, width: "100%", marginBottom: 8 }}
        />
        <button style={buttonStyle} onClick={adminLogin}>
          Увійти
        </button>
        {adminError && <p style={{ color: "red" }}>{adminError}</p>}
      </div>
    );
  }

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
        <button
          style={{ ...buttonStyle, background: "#222" }}
          onClick={() => setIsAdminLogin(true)}
        >
          Вхід для Адміна
        </button>
      </div>
    );
  }

  // --- Інтерфейс адміністратора ---
  if (role === "admin") {
    return (
      <div style={containerStyle}>
        <h2>Адмін-панель</h2>
        <p>Встановіть кількість груп (1–10):</p>
        <input
          type="number"
          min="1"
          max="10"
          value={groupCount}
          onChange={(e) => setGroupCount(Number(e.target.value))}
          style={{ padding: 8, borderRadius: 6, width: 80 }}
        />
        <button style={buttonStyle} onClick={setGroupsAdmin}>
          Зберегти
        </button>
        <p>Поточна кількість груп: {groupCount}</p>
      </div>
    );
  }

  // --- Інтерфейс гравця ---
  return (
    <div style={containerStyle}>
      <h2>👋 Вітаємо, {name}! Ваша роль: {role}</h2>
      <p>Вибрана група: {group}</p>
      {role && CARDS[role] && (
        <div>
          <h3>Ваша картка:</h3>
          <img
            src={CARDS[role]}
            alt={`Картка ${role}`}
            style={{ width: "100%", maxWidth: 400, borderRadius: 8 }}
          />
        </div>
      )}
    </div>
  );
}
