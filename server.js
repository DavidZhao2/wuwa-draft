const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.get('/health', (_req, res) => res.json({ ok: true }));

const START_COUNTDOWN_MS = 10_000;
const COIN_FLIP_MS = 3_000;
const COIN_RESULT_MS = 3_000;
const TURN_TIME_MS = 90_000;
const rooms = new Map();
const characters = [
  'Aalto', 'Aemeath', 'Augusta', 'Baizhi', 'Brant', 'Buling', 'Calcharo',
  'Camellya', 'Cantarella', 'Carlotta', 'Cartethyia', 'Changli', 'Chisa',
  'Chixia', 'Ciaccona', 'Danjin', 'Denia', 'Encore', 'Galbrena', 'Hiyuki',
  'Hsin', 'Iuno', 'Jianxin', 'Jingran', 'Jinhsi', 'Jiyan', 'Lingyang',
  'Lucilla', 'Lucy', 'Lumi', 'Luuk Herssen', 'Lupa', 'Lynae', 'Mornye',
  'Mortefi', 'Phoebe', 'Phrolova', 'Qingxiao', 'Qiuyuan', 'Rebecca',
  'Roccia', 'Rover', 'Sanhua', 'Shorekeeper', 'Sigrika', 'Suisui',
  'Suoming', 'Taoqi', 'Verina', 'Xiangli Yao', 'Yangyang',
  'Yangyang: Xuanling', 'Yinlin', 'Youhu', 'Yuanwu', 'Zani', 'Zhezhi'
];
const characterSet = new Set(characters);
const bosses = [
  'Rustfire Chassis', 'Denia', 'Nameless Explorer', 'Sigilum', 'Hyvatia',
  'Reactor Husk', 'Dreamless', 'False Sovereign', 'Lioness of Glory',
  'Lady of the Sea', 'Fleurdelys', 'Kelpie', 'Lorelei', 'Dragon of Dirge',
  'Hecate', 'Sentry Construct', 'Fallacy of No Return', 'Inferno Rider',
  'Crownless', 'Feilian Beringal', 'Mourning Aix', 'Impermanence Heron',
  'Tempest Mephis'
];
const bossSet = new Set(bosses);

function buildSteps(firstSide = 'A') {
  const otherSide = firstSide === 'A' ? 'B' : 'A';
  return [
  ...[firstSide, otherSide, otherSide, firstSide, firstSide, otherSide].map(side => ({ phase: 'initial-ban', type: 'initial-ban', side })),
  ...[otherSide, firstSide, firstSide, otherSide, otherSide, firstSide, firstSide, otherSide, otherSide, firstSide, firstSide, otherSide, otherSide, firstSide, firstSide, otherSide, otherSide, firstSide]
    .map(side => ({ phase: 'pick', type: 'pick', side })),
  ...[firstSide, otherSide, firstSide, otherSide].map(side => ({
    phase: 'team-ban', type: 'team-ban', side, targetSide: side === 'A' ? 'B' : 'A'
  }))
  ];
}

const makeCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();
const safe = value => String(value || '').slice(0, 60);
const cleanName = (value, fallback) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 16) || fallback;
const cleanMessage = value => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 280);
const randomBosses = (previous = []) => {
  const previousKey = [...previous].sort().join('|');
  let selection;
  do {
    selection = [...bosses].sort(() => Math.random() - 0.5).slice(0, 5);
  } while ([...selection].sort().join('|') === previousKey);
  return selection;
};

function publicState(room, viewerRole = 'spectator') {
  const step = room.steps[room.history.length];
  const canViewTeam = side => viewerRole === 'spectator' || viewerRole === side || room.teamVisibility[side];
  return {
    code: room.code,
    history: room.history,
    messages: room.messages,
    teams: {
      A: canViewTeam('A') ? room.teams.A : room.teams.A.map(() => []),
      B: canViewTeam('B') ? room.teams.B : room.teams.B.map(() => [])
    },
    teamVisibility: room.teamVisibility,
    bosses: room.bosses,
    bossMode: room.bossMode,
    phase: step?.phase || 'complete',
    turn: step?.side || null,
    targetSide: step?.targetSide || null,
    names: room.names,
    ready: room.ready,
    countdownEndsAt: room.countdownEndsAt,
    coinFlipEndsAt: room.coinFlipEndsAt,
    coinRevealAt: room.coinRevealAt,
    coinResult: room.coinResult,
    firstSide: room.firstSide,
    actionDeadline: room.actionDeadline,
    turnTimeMs: TURN_TIME_MS,
    spectatorCount: Object.keys(room.spectators).length,
    online: { A: Boolean(room.players.A), B: Boolean(room.players.B) }
  };
}

function publish(room) {
  for (const side of ['A', 'B']) {
    const socketId = room.players[side];
    if (socketId) io.to(socketId).emit('state', publicState(room, side));
  }
  for (const socketId of Object.keys(room.spectators)) {
    io.to(socketId).emit('state', publicState(room, 'spectator'));
  }
}

function joinSocket(socket, room, role) {
  socket.join(room.code);
  socket.data.room = room.code;
  socket.data.role = role;
  socket.emit('joined', { code: room.code, role });
  publish(room);
}

function legalCharacters(room, step) {
  if (!step) return [];
  if (step.phase === 'initial-ban' || step.phase === 'pick') {
    const used = new Set(room.history.map(item => item.character));
    return characters.filter(character => !used.has(character));
  }
  const alreadyBanned = new Set(room.history.filter(item => item.type === 'team-ban').map(item => item.character));
  return room.history
    .filter(item => item.type === 'pick' && item.side === step.targetSide && !alreadyBanned.has(item.character))
    .map(item => item.character);
}

function isLegalAction(room, step, character) {
  return characterSet.has(character) && legalCharacters(room, step).includes(character);
}

function addAction(room, step, character, automatic = false) {
  room.history.push({
    side: step.side,
    type: step.type,
    phase: step.phase,
    targetSide: step.targetSide || null,
    character,
    automatic
  });
  if (step.type === 'team-ban') {
    room.teams[step.targetSide] = room.teams[step.targetSide].map(team => team.filter(name => name !== character));
  }
}

function leaveRoom(socket) {
  const room = rooms.get(socket.data.room);
  if (!room) return;
  for (const side of ['A', 'B']) {
    if (room.players[side] === socket.id) room.players[side] = null;
  }
  delete room.spectators[socket.id];
  if (!room.ready) cancelStartCountdown(room);
  socket.leave(room.code);
  socket.data.room = null;
  socket.data.role = null;
  publish(room);
}

function scheduleTurn(room) {
  clearTimeout(room.actionTimeout);
  const step = room.steps[room.history.length];
  if (!step) {
    room.actionDeadline = null;
    room.actionTimeout = null;
    publish(room);
    return;
  }
  room.actionDeadline = Date.now() + TURN_TIME_MS;
  room.actionTimeout = setTimeout(() => {
    const currentStep = room.steps[room.history.length];
    const legal = legalCharacters(room, currentStep);
    if (currentStep && legal.length) {
      const character = legal[Math.floor(Math.random() * legal.length)];
      addAction(room, currentStep, character, true);
    }
    scheduleTurn(room);
  }, TURN_TIME_MS);
  publish(room);
}

function beginStartCountdown(room) {
  if (room.ready || room.countdownEndsAt || room.coinFlipEndsAt || !room.players.A || !room.players.B) return;
  clearTimeout(room.startTimeout);
  room.countdownEndsAt = Date.now() + START_COUNTDOWN_MS;
  room.startTimeout = setTimeout(() => {
    room.countdownEndsAt = null;
    if (!room.players.A || !room.players.B) return publish(room);
    room.coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
    room.firstSide = room.coinResult === 'heads' ? 'A' : 'B';
    room.steps = buildSteps(room.firstSide);
    room.coinRevealAt = Date.now() + COIN_FLIP_MS;
    room.coinFlipEndsAt = room.coinRevealAt + COIN_RESULT_MS;
    room.startTimeout = setTimeout(() => {
      room.startTimeout = null;
      room.coinFlipEndsAt = null;
      room.coinRevealAt = null;
      if (!room.players.A || !room.players.B) return publish(room);
      room.ready = true;
      scheduleTurn(room);
    }, COIN_FLIP_MS + COIN_RESULT_MS);
    publish(room);
  }, START_COUNTDOWN_MS);
  publish(room);
}

function cancelStartCountdown(room) {
  clearTimeout(room.startTimeout);
  room.startTimeout = null;
  room.countdownEndsAt = null;
  room.coinFlipEndsAt = null;
  room.coinRevealAt = null;
}

io.on('connection', socket => {
  socket.on('create', (payload = {}) => {
    const bossMode = ['random', 'custom', 'none'].includes(payload.bossMode) ? payload.bossMode : 'none';
    const chosenBosses = [...new Set(Array.isArray(payload.bosses) ? payload.bosses.map(safe) : [])]
      .filter(boss => bossSet.has(boss));
    if (bossMode === 'custom' && chosenBosses.length !== 5) {
      return socket.emit('errorMessage', 'Choose exactly five bosses');
    }
    let id = makeCode();
    while (rooms.has(id)) id = makeCode();
    const room = {
      code: id,
      players: { A: socket.id, B: null },
      spectators: {},
      names: { A: cleanName(payload.name, 'Player A'), B: 'Player B' },
      history: [],
      messages: [],
      bossMode,
      bosses: bossMode === 'random' ? randomBosses() : bossMode === 'custom' ? chosenBosses : [],
      teams: { A: [[], [], []], B: [[], [], []] },
      teamVisibility: { A: false, B: false },
      firstSide: 'A',
      steps: buildSteps('A'),
      coinResult: null,
      coinFlipEndsAt: null,
      coinRevealAt: null,
      ready: false,
      countdownEndsAt: null,
      actionDeadline: null,
      startTimeout: null,
      actionTimeout: null
    };
    rooms.set(id, room);
    joinSocket(socket, room, 'A');
  });

  socket.on('join', ({ code: raw, name } = {}) => {
    const id = safe(raw).toUpperCase();
    const room = rooms.get(id);
    if (!room) return socket.emit('errorMessage', 'Room not found');
    const role = !room.players.A ? 'A' : !room.players.B ? 'B' : 'spectator';
    if (role !== 'spectator') {
      room.players[role] = socket.id;
      room.names[role] = cleanName(name, `Player ${role}`);
    } else {
      room.spectators[socket.id] = cleanName(name, 'Spectator');
    }
    joinSocket(socket, room, role);
    beginStartCountdown(room);
  });

  socket.on('action', ({ character: raw } = {}) => {
    const room = rooms.get(socket.data.room);
    const step = room && room.steps[room.history.length];
    const character = safe(raw);
    if (!room || !room.ready || !step || socket.data.role !== step.side) return;
    if (!isLegalAction(room, step, character)) return;
    clearTimeout(room.actionTimeout);
    addAction(room, step, character);
    scheduleTurn(room);
  });

  socket.on('chat', ({ text: raw } = {}) => {
    const room = rooms.get(socket.data.room);
    const side = socket.data.role;
    const text = cleanMessage(raw);
    if (!room || !['A', 'B', 'spectator'].includes(side) || !text) return;
    const sender = side === 'spectator' ? room.spectators[socket.id] : room.names[side];
    if (!sender) return;
    room.messages.push({ id: crypto.randomUUID(), clientId: socket.id, side, sender, text, time: Date.now() });
    room.messages = room.messages.slice(-100);
    publish(room);
  });

  socket.on('assign', ({ character: raw, team: rawTeam } = {}) => {
    const room = rooms.get(socket.data.room);
    const side = socket.data.role;
    const character = safe(raw);
    const team = Number(rawTeam);
    if (!room || !['A', 'B'].includes(side) || !Number.isInteger(team) || team < 0 || team >= room.teams[side].length) return;
    const isOwned = room.history.some(item => item.type === 'pick' && item.side === side && item.character === character);
    const isBanned = room.history.some(item => item.type === 'team-ban' && item.targetSide === side && item.character === character);
    if (!isOwned || isBanned) return;
    if (room.teams[side][team].includes(character) || room.teams[side][team].length >= 3) return;
    room.teams[side][team].push(character);
    publish(room);
  });

  socket.on('unassign', ({ character: raw, team: rawTeam } = {}) => {
    const room = rooms.get(socket.data.room);
    const side = socket.data.role;
    const character = safe(raw);
    const team = Number(rawTeam);
    if (!room || !['A', 'B'].includes(side) || !Number.isInteger(team) || team < 0 || team >= room.teams[side].length) return;
    room.teams[side][team] = room.teams[side][team].filter(name => name !== character);
    publish(room);
  });

  socket.on('addTeam', () => {
    const room = rooms.get(socket.data.room);
    const side = socket.data.role;
    if (!room || !['A', 'B'].includes(side) || room.teams[side].length >= 10) return;
    room.teams[side].push([]);
    publish(room);
  });

  socket.on('removeTeam', () => {
    const room = rooms.get(socket.data.room);
    const side = socket.data.role;
    if (!room || !['A', 'B'].includes(side) || room.teams[side].length <= 3) return;
    const lastTeam = room.teams[side][room.teams[side].length - 1];
    if (lastTeam.length) return;
    room.teams[side].pop();
    publish(room);
  });

  socket.on('toggleTeamVisibility', () => {
    const room = rooms.get(socket.data.room);
    const side = socket.data.role;
    if (!room || !['A', 'B'].includes(side)) return;
    room.teamVisibility[side] = !room.teamVisibility[side];
    publish(room);
  });

  socket.on('leaveRoom', () => leaveRoom(socket));

  socket.on('reset', () => {
    const room = rooms.get(socket.data.room);
    if (!room || socket.data.role !== 'A') return;
    clearTimeout(room.actionTimeout);
    cancelStartCountdown(room);
    room.history = [];
    room.teams = { A: [[], [], []], B: [[], [], []] };
    room.teamVisibility = { A: false, B: false };
    room.ready = false;
    room.coinResult = null;
    room.coinRevealAt = null;
    room.actionDeadline = null;
    if (room.bossMode === 'random') room.bosses = randomBosses(room.bosses);
    if (room.players.A && room.players.B) beginStartCountdown(room);
    else publish(room);
  });

  socket.on('disconnect', () => {
    leaveRoom(socket);
  });
});

server.listen(process.env.PORT || 3000, () => console.log('WuWa Draft Arena running'));
