const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const crypto=require('crypto');
const app=express(),server=http.createServer(app),io=new Server(server);
app.use(express.static('public'));
app.get('/health',(_req,res)=>res.json({ok:true}));
const rooms=new Map();
const sequence=['ban','ban','pick','pick','pick','pick','ban','ban','pick','pick','pick','pick'];
const sideFor=(i)=>['A','B','A','B','B','A','A','B','A','B','B','A'][i];
const code=()=>crypto.randomBytes(3).toString('hex').toUpperCase();
const safe=(v)=>String(v||'').slice(0,60);
function publish(r){io.to(r.code).emit('state',{code:r.code,history:r.history,teams:r.teams,phase:sequence[r.history.length]||'complete',turn:sideFor(r.history.length),ready:r.ready,online:{A:!!r.players.A,B:!!r.players.B}})}
function join(socket,r,role){socket.join(r.code);socket.data.room=r.code;socket.data.role=role;socket.emit('joined',{code:r.code,role});publish(r)}
io.on('connection',socket=>{
 socket.on('create',()=>{let id=code();while(rooms.has(id))id=code();const r={code:id,players:{A:socket.id,B:null},history:[],teams:{A:[[],[],[]],B:[[],[],[]]},ready:false};rooms.set(id,r);join(socket,r,'A')});
 socket.on('join',({code:raw})=>{const id=safe(raw).toUpperCase(),r=rooms.get(id);if(!r)return socket.emit('errorMessage','Room not found');const role=!r.players.A?'A':!r.players.B?'B':'spectator';if(role!=='spectator')r.players[role]=socket.id;join(socket,r,role)});
 socket.on('action',({character})=>{const r=rooms.get(socket.data.room),side=socket.data.role;if(!r||!r.ready||r.history.length>=sequence.length||side!==sideFor(r.history.length))return;character=safe(character);if(!character||r.history.some(h=>h.character===character))return;const type=sequence[r.history.length];r.history.push({side,type,character});publish(r)});
 socket.on('start',()=>{const r=rooms.get(socket.data.room);if(r&&socket.data.role==='A'&&r.players.A&&r.players.B){r.ready=true;publish(r)}});
 socket.on('assign',({character,slot})=>{const r=rooms.get(socket.data.room),side=socket.data.role;if(!r||r.history.length!==sequence.length||!['A','B'].includes(side)||!Number.isInteger(slot)||slot<0||slot>2)return;const owned=r.history.filter(h=>h.side===side&&h.type==='pick').map(h=>h.character);if(!owned.includes(character))return;for(const team of r.teams[side]){const idx=team.indexOf(character);if(idx>=0)team.splice(idx,1)}const team=r.teams[side][slot];if(team.length<3)team.push(character);publish(r)});
 socket.on('reset',()=>{const r=rooms.get(socket.data.room);if(r&&socket.data.role==='A'){r.history=[];r.teams={A:[[],[],[]],B:[[],[],[]]};r.ready=!!(r.players.A&&r.players.B);publish(r)}});
 socket.on('disconnect',()=>{const r=rooms.get(socket.data.room);if(!r)return;for(const side of ['A','B'])if(r.players[side]===socket.id)r.players[side]=null;publish(r)})
});
server.listen(process.env.PORT||3000,()=>console.log('WuWa Draft Arena running'));
