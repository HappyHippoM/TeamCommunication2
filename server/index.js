// Updated server with auto-role assignment and private communication
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 4000;

const ROLES = ['A','B','C','D','E','F'];
const CARDS = {
  A: ['','','','',''],
  B: ['','','','',''],
  C: ['','','','',''],
  D: ['','','','',''],
  E: ['','','•','',''],
  F: ['','','','','']
};

const room = { players: {}, rolesTaken: {} };

function nextFreeRole(){ for(const r of ROLES) if(!room.rolesTaken[r]) return r; return null; }
function allowedRecipients(fromRole){ return fromRole==='C'?ROLES.filter(r=>r!=='C'):['C']; }

io.on('connection',socket=>{
  socket.on('register',({name},cb)=>{
    if(!name) return cb({ok:false,error:'Ім’я обов’язкове'});
    const role=nextFreeRole(); if(!role) return cb({ok:false,error:'Усі ролі зайняті'});
    room.players[socket.id]={name,role}; room.rolesTaken[role]=socket.id; socket.join('game');
    socket.emit('card',{role,card:CARDS[role]}); io.to('game').emit('players',getPublicPlayers()); cb({ok:true,role});
  });

  socket.on('send_message',({toRole,text},cb)=>{
    const p=room.players[socket.id]; if(!p) return cb({ok:false,error:'Не зареєстровано'});
    const fromRole=p.role; const allowed=allowedRecipients(fromRole);
    if(!allowed.includes(toRole)) return cb({ok:false,error:`Не можна надсилати до ${toRole}`});
    const recip=room.rolesTaken[toRole]; if(!recip) return cb({ok:false,error:'Одержувача не знайдено'});
    io.to(recip).emit('private_message',{from:fromRole,text}); cb({ok:true});
  });

  socket.on('submit_answer',({answer},cb)=>{
    const p=room.players[socket.id]; if(!p||p.role!=='C') return cb({ok:false,error:'Тільки С може відповісти'});
    const norm=String(answer).trim(); if(!norm) return cb({ok:false,error:'Порожня відповідь'});
    const missing=[]; for(const pl of Object.values(room.players)){if(!CARDS[pl.role].includes(norm)) missing.push(pl.role);}
    if(missing.length===0){io.to('game').emit('game_result',{ok:true,answer:norm,message:`Спільна фігура: ${norm}`});cb({ok:true});}
    else cb({ok:false,error:'Невірно. Відсутній у: '+missing.join(',')});
  });

  socket.on('disconnect',()=>{
    const p=room.players[socket.id]; if(p){delete room.rolesTaken[p.role]; delete room.players[socket.id]; io.to('game').emit('players',getPublicPlayers());}
  });
});

function getPublicPlayers(){return Object.values(room.players).map(pl=>({name:pl.name,role:pl.role}));}
app.get('/',(req,res)=>res.send('Server running'));
server.listen(PORT,()=>console.log('Server running on',PORT));
