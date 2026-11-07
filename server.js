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
const TURN_TIME_MS = 30_000;
const DRAFT_FORMATS = {
  regular: { label: 'Regular Draft', picksPerPlayer: 9, finalBansPerPlayer: 2, bossCount: 5 },
  semifinal: { label: 'Semi Final Draft', picksPerPlayer: 9, finalBansPerPlayer: 0, bossCount: 5 },
  'grand-final': { label: 'Grand Final Draft', picksPerPlayer: 6, finalBansPerPlayer: 0, bossCount: 2 }
};
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

function buildSteps(firstSide = 'A', draftFormat = 'regular') {
  const otherSide = firstSide === 'A' ? 'B' : 'A';
  const picksPerPlayer = DRAFT_FORMATS[draftFormat].picksPerPlayer;
  // Grand Final rewards the last opening banner with first pick. In the
  // other formats, first pick goes to the opposite side.
  const pickFirstSide = draftFormat === 'grand-final' ? otherSide : firstSide;
  const pickOtherSide = pickFirstSide === 'A' ? 'B' : 'A';
  return [
    ...[firstSide, otherSide, otherSide, firstSide, firstSide, otherSide]
      .map(side => ({ phase: 'initial-ban', type: 'initial-ban', side })),
    ...Array.from({ length: picksPerPlayer * 2 }, (_, index) => ({
      phase: 'pick',
      type: 'pick',
      side: index === 0
        ? pickFirstSide
        : Math.floor((index - 1) / 2) % 2 === 0 ? pickOtherSide : pickFirstSide
    }))
  ];
}

function finalBanCount(room, side) {
  return room.history.filter(item => item.type === 'team-ban' && item.side === side).length;
}

function currentStep(room) {
  const sequentialStep = room.steps[room.history.length];
  if (sequentialStep) return sequentialStep;
  const finalBansPerPlayer = DRAFT_FORMATS[room.draftFormat].finalBansPerPlayer;
  if (finalBansPerPlayer && ['A', 'B'].some(side => finalBanCount(room, side) < finalBansPerPlayer)) {
    return { phase: 'team-ban', type: 'team-ban', simultaneous: true };
  }
  return null;
}

const makeCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();
const safe = value => String(value || '').slice(0, 60);
const cleanName = (value, fallback) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 16) || fallback;
const cleanMessage = value => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 280);
const randomBosses = (previous = [], count = 5) => {
  const previousKey = [...previous].sort().join('|');
  let selection;
  do {
    selection = [...bosses].sort(() => Math.random() - 0.5).slice(0, count);
  } while ([...selection].sort().join('|') === previousKey);
  return selection;
};

function publicState(room, viewerRole = 'spectator') {
  const step = currentStep(room);
  const format = DRAFT_FORMATS[room.draftFormat];
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
    bossCount: format.bossCount,
    draftFormat: room.draftFormat,
    formatLabel: format.label,
    picksPerPlayer: format.picksPerPlayer,
    pickFirstSide: room.draftFormat === 'grand-final'
      ? (room.firstSide === 'A' ? 'B' : 'A')
      : room.firstSide,
    canRerollBosses: viewerRole === 'A' && room.history.length === 0,
    finalBansPerPlayer: format.finalBansPerPlayer,
    banProgress: { A: finalBanCount(room, 'A'), B: finalBanCount(room, 'B') },
    phase: step?.phase || 'complete',
    turn: step?.side || null,
    targetSide: step?.targetSide || (step?.phase === 'team-ban' && ['A', 'B'].includes(viewerRole)
      ? (viewerRole === 'A' ? 'B' : 'A')
      : null),
    simultaneous: Boolean(step?.simultaneous),
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

function legalCharacters(room, step, actingSide = step?.side) {
  if (!step) return [];
  if (step.phase === 'initial-ban' || step.phase === 'pick') {
    const used = new Set(room.history.map(item => item.character));
    return characters.filter(character => !used.has(character));
  }
  if (!['A', 'B'].includes(actingSide)) return [];
  const targetSide = actingSide === 'A' ? 'B' : 'A';
  const alreadyBanned = new Set(room.history.filter(item => item.type === 'team-ban').map(item => item.character));
  return room.history
    .filter(item => item.type === 'pick' && item.side === targetSide && !alreadyBanned.has(item.character))
    .map(item => item.character);
}

function isLegalAction(room, step, character, actingSide = step?.side) {
  return characterSet.has(character) && legalCharacters(room, step, actingSide).includes(character);
}

function addAction(room, step, character, automatic = false, actingSide = step.side) {
  const targetSide = step.type === 'team-ban' ? (actingSide === 'A' ? 'B' : 'A') : null;
  room.history.push({
    side: actingSide,
    type: step.type,
    phase: step.phase,
    targetSide,
    character,
    automatic
  });
  if (step.type === 'team-ban') {
    room.teams[targetSide] = room.teams[targetSide].map(team => team.filter(name => name !== character));
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
  const step = currentStep(room);
  if (!step) {
    room.actionDeadline = null;
    room.actionTimeout = null;
    publish(room);
    return;
  }
  room.actionDeadline = Date.now() + TURN_TIME_MS;
  room.actionTimeout = setTimeout(() => {
    const activeStep = currentStep(room);
    if (activeStep?.phase === 'team-ban') {
      const required = DRAFT_FORMATS[room.draftFormat].finalBansPerPlayer;
      for (const side of ['A', 'B']) {
        while (finalBanCount(room, side) < required) {
          const legal = legalCharacters(room, activeStep, side);
          if (!legal.length) break;
          addAction(room, activeStep, legal[Math.floor(Math.random() * legal.length)], true, side);
        }
      }
    } else {
      const legal = legalCharacters(room, activeStep);
      if (activeStep && legal.length) {
        addAction(room, activeStep, legal[Math.floor(Math.random() * legal.length)], true);
      }
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
    room.steps = buildSteps(room.firstSide, room.draftFormat);
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
    const draftFormat = DRAFT_FORMATS[payload.draftFormat] ? payload.draftFormat : 'regular';
    const bossCount = DRAFT_FORMATS[draftFormat].bossCount;
    const bossMode = ['random', 'custom', 'none'].includes(payload.bossMode) ? payload.bossMode : 'none';
    const chosenBosses = [...new Set(Array.isArray(payload.bosses) ? payload.bosses.map(safe) : [])]
      .filter(boss => bossSet.has(boss));
    if (bossMode === 'custom' && chosenBosses.length !== bossCount) {
      return socket.emit('errorMessage', `Choose exactly ${bossCount} bosses`);
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
      draftFormat,
      bossMode,
      bosses: bossMode === 'random' ? randomBosses([], bossCount) : bossMode === 'custom' ? chosenBosses : [],
      teams: { A: [[], [], []], B: [[], [], []] },
      teamVisibility: { A: false, B: false },
      firstSide: 'A',
      steps: buildSteps('A', draftFormat),
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
    const step = room && currentStep(room);
    const side = socket.data.role;
    const character = safe(raw);
    if (!room || !room.ready || !step || !['A', 'B'].includes(side)) return;
    if (step.phase === 'team-ban') {
      const required = DRAFT_FORMATS[room.draftFormat].finalBansPerPlayer;
      if (finalBanCount(room, side) >= required || !isLegalAction(room, step, character, side)) return;
      addAction(room, step, character, false, side);
      if (!currentStep(room)) {
        clearTimeout(room.actionTimeout);
        room.actionDeadline = null;
        room.actionTimeout = null;
      }
      publish(room);
      return;
    }
    if (side !== step.side || !isLegalAction(room, step, character)) return;
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

  socket.on('rerollBoss', ({ index: rawIndex } = {}) => {
    const room = rooms.get(socket.data.room);
    const index = Number(rawIndex);
    if (!room || socket.data.role !== 'A' || room.history.length > 0) return;
    if (!Number.isInteger(index) || index < 0 || index >= room.bosses.length) return;
    const available = bosses.filter(boss => !room.bosses.includes(boss));
    if (!available.length) return;
    room.bosses[index] = available[Math.floor(Math.random() * available.length)];
    publish(room);
  });

  socket.on('leaveRoom', () => leaveRoom(socket));

  socket.on('reset', () => {
    const room = rooms.get(socket.data.room);
    if (!room || socket.data.role !== 'A') return;
    clearTimeout(room.actionTimeout);
    room.actionTimeout = null;
    cancelStartCountdown(room);
    room.history = [];
    room.teams = { A: [[], [], []], B: [[], [], []] };
    room.teamVisibility = { A: false, B: false };
    room.ready = false;
    room.firstSide = 'A';
    room.steps = buildSteps('A', room.draftFormat);
    room.coinResult = null;
    room.coinRevealAt = null;
    room.actionDeadline = null;
    if (room.bossMode === 'random') {
      room.bosses = randomBosses(room.bosses, DRAFT_FORMATS[room.draftFormat].bossCount);
    }
    socket.emit('resetComplete');
    if (room.players.A && room.players.B) beginStartCountdown(room);
    else publish(room);
  });

  socket.on('disconnect', () => {
    leaveRoom(socket);
  });
});

server.listen(process.env.PORT || 3000, () => console.log('WuWa Draft Arena running'));
