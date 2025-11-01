import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER = import.meta.env.VITE_SERVER || 'https://teamcommunicationgame.onrender.com/';
const socket = io(SERVER);

export default function App() {
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState({});
  const [reply, setReply] = useState({});

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('role_assigned', (assignedRole) => {
      setRole(assignedRole);
    });

    socket.on('players', setPlayers);

    socket.on('private_message', ({ from, text }) => {
      setMessages(m => ({
        ...m,
        [from]: [...(m[from] || []), `${from}: ${text}`]
      }));
    });

    socket.on('game_result', ({ message }) => alert(message));
  }, []);

  const register = () => {
    if (!name) return;
    socket.emit('register', { name }, res => {
      if (!res.ok) return alert(res.error);
      setRole(res.role);
    });
  };

  const sendMessage = (toRole) => {
    const text = reply[toRole];
    if (!text) return;
    socket.emit('send_message', { toRole, text }, res => {
      if (!res.ok) return alert(res.error);
      setMessages(m => ({
        ...m,
        [toRole]: [...(m[toRole] || []), `You: ${text}`]
      }));
      setReply(r => ({ ...r, [toRole]: '' }));
    });
  };

  if (!role) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Реєстрація</h2>
        <input placeholder='Ваше ім’я' value={name} onChange={e => setName(e.target.value)} />
        <button onClick={register}>Увійти</button>
      </div>
    );
  }

  // Шлях до картки у папці public/cards/
  const cardSrc = `/cards/${role}.jpg`;

  return (
    <div style={{ padding: 20 }}>
      <h2>Ваша роль: {role}</h2>

      {/* Відображення картки */}
      <div>
        <h3>Ваша картка:</h3>
        <img src={cardSrc} alt={`Картка ${role}`} style={{ width: "300px", height: "auto" }} />
      </div>

      {/* Повідомлення */}
      <div style={{ marginTop: 20 }}>
        <h3>Повідомлення</h3>
        {role === 'B' ? (
          // B бачить всіх і може писати всім
          ['A','C','D','E','F'].map(r => (
            <div key={r} style={{ border: '1px solid #ccc', marginTop: 8, padding: 8 }}>
              <strong>{r}</strong>
              <div>{(messages[r] || []).map((m,i) => <div key={i}>{m}</div>)}</div>
              <input
                placeholder={`Відповідь ${r}`}
                value={reply[r] || ''}
                onChange={e => setReply({ ...reply, [r]: e.target.value })}
              />
              <button onClick={() => sendMessage(r)}>Надіслати</button>
            </div>
          ))
        ) : (
          // Інші пишуть лише B
          <div style={{ border: '1px solid #ccc', marginTop: 8, padding: 8 }}>
            <strong>Повідомлення до B</strong>
            <div>{(messages['B'] || []).map((m,i) => <div key={i}>{m}</div>)}</div>
            <input
              placeholder="Ваше повідомлення"
              value={reply['B'] || ''}
              onChange={e => setReply({ ...reply, B: e.target.value })}
            />
            <button onClick={() => sendMessage('B')}>Надіслати B</button>
          </div>
        )}
      </div>
    </div>
  );
}
