import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GameEngine } from './src/engine/GameEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static assets from public/
app.use(express.static(path.resolve(__dirname, 'public')));

// Multiplayer Room Storage
interface RoomClient {
  id: string;
  name: string;
  avatarId?: string;
  token: string;
  res?: Response;
}

interface RoomBot {
  id: string;
  name: string;
  avatarId?: string;
}

interface Room {
  id: string;
  hostId: string;
  totalRounds: number;
  clients: Map<string, RoomClient>;
  bots: RoomBot[];
  engine: GameEngine | null;
}

const rooms = new Map<string, Room>();

const BOT_NAME_POOL = ['سینا (بات)', 'آریا (بات)', 'مریم (بات)', 'پرهام (بات)', 'رویا (بات)', 'کیان (بات)'];

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function getRoomParticipants(room: Room) {
  const humans = Array.from(room.clients.values()).map((c) => ({
    id: c.id,
    name: c.name,
    avatarId: c.avatarId || 'avatar_1',
    isBot: false,
  }));
  const bots = room.bots.map((b, idx) => ({
    id: b.id,
    name: b.name,
    avatarId: b.avatarId || `avatar_${((idx + 2) % 10) + 1}`,
    isBot: true,
  }));
  return [...humans, ...bots];
}

function broadcastRoom(room: Room, event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  room.clients.forEach((client) => {
    if (client.res) {
      try {
        client.res.write(payload);
      } catch {
        // client disconnected
      }
    }
  });
}

function broadcastRoomLobby(room: Room) {
  const participants = getRoomParticipants(room);
  broadcastRoom(room, 'lobby', {
    names: participants.map((p) => p.name),
    players: participants,
  });
}

function broadcastRoomState(room: Room) {
  if (!room.engine) return;
  const fullState = room.engine.state;
  room.clients.forEach((client) => {
    if (client.res) {
      try {
        const masked = {
          ...fullState,
          players: fullState.players.map((p) => {
            if (p.id === client.id) return p;
            return {
              ...p,
              hand: Array.from({ length: p.hand.length }).map((_, i) => ({
                id: `hidden_${p.id}_${i}`,
                suit: 'SPADES' as const,
                rank: 'TWO' as const,
              })),
            };
          }),
        };
        client.res.write(`event: state\ndata: ${JSON.stringify(masked)}\n\n`);
      } catch {
        // client disconnected
      }
    }
  });
}

function triggerRoomBotIfNeeded(room: Room) {
  if (!room.engine) return;
  const state = room.engine.state;
  if (state.isRoundOver || state.isGameOver) return;

  const current = state.players[state.currentTurnIndex];
  const hasCatchTarget = !!state.catchTargetId && !state.catchTargetId.startsWith('bot_');

  if (current?.isBot || hasCatchTarget) {
    const delay = current?.isBot ? 950 : 2100;
    setTimeout(() => {
      if (!room.engine) return;
      const changed = room.engine.stepBotIfNeeded();
      if (changed) {
        broadcastRoomState(room);
        triggerRoomBotIfNeeded(room);
      }
    }, delay);
  }
}

let latestRoomId = '';

// 1. Create Room
app.post('/api/rooms/create', (req: Request, res: Response) => {
  const { hostName, totalRounds } = req.body;
  const roomId = generateRoomId();
  latestRoomId = roomId;
  const room: Room = {
    id: roomId,
    hostId: '',
    totalRounds: Number(totalRounds) || 5,
    clients: new Map(),
    bots: [],
    engine: null,
  };
  rooms.set(roomId, room);
  res.json({ roomId });
});

// 1.5 Get Latest Active Table (برای اتصال خودکار مثل هات‌اسپات بدون نیاز به کد)
app.get('/api/rooms/latest', (_req: Request, res: Response) => {
  if (latestRoomId && rooms.has(latestRoomId)) {
    res.json({ roomId: latestRoomId });
  } else if (rooms.size > 0) {
    const firstKey = Array.from(rooms.keys())[rooms.size - 1];
    res.json({ roomId: firstKey });
  } else {
    res.status(404).json({ error: 'No active room found' });
  }
});

// 2. Room SSE Connection
app.get('/api/rooms/:id/events', (req: Request, res: Response) => {
  const roomId = String(req.params.id || '').toUpperCase();
  const room = rooms.get(roomId);
  if (!room) {
    res.status(404).send('Room not found');
    return;
  }

  const name = String(req.query.name || 'بازیکن').trim().slice(0, 20);
  const avatarId = String(req.query.avatar || 'avatar_1');
  const clientId = `P_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const token = Math.random().toString(36).substring(2, 10);

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!room.hostId) {
    room.hostId = clientId;
  }

  const client: RoomClient = { id: clientId, name, avatarId, token, res };
  room.clients.set(clientId, client);

  // Welcome message with assigned client id & token
  res.write(`event: welcome\ndata: ${JSON.stringify({ id: clientId, token, isHost: room.hostId === clientId })}\n\n`);

  // Broadcast updated lobby
  broadcastRoomLobby(room);

  // If game already started, send current state
  if (room.engine) {
    broadcastRoomState(room);
  }

  // Handle client disconnect
  req.on('close', () => {
    room.clients.delete(clientId);
    if (room.clients.size === 0) {
      rooms.delete(roomId);
    } else {
      broadcastRoomLobby(room);
    }
  });
});

// 3. Add AI Bot to Room
app.post('/api/rooms/:id/add-bot', (req: Request, res: Response) => {
  const roomId = String(req.params.id || '').toUpperCase();
  const room = rooms.get(roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const total = room.clients.size + room.bots.length;
  if (total >= 7) {
    res.status(400).json({ error: 'Maximum 7 players reached' });
    return;
  }

  const nextBotIdx = room.bots.length;
  const botName = BOT_NAME_POOL[nextBotIdx % BOT_NAME_POOL.length] || `ربات ${nextBotIdx + 1}`;
  const botId = `bot_${Date.now()}_${nextBotIdx + 1}`;
  const avatarId = `avatar_${((nextBotIdx + 2) % 10) + 1}`;

  room.bots.push({ id: botId, name: botName, avatarId });
  broadcastRoomLobby(room);
  res.json({ ok: true, bots: room.bots });
});

// 4. Remove AI Bot from Room
app.post('/api/rooms/:id/remove-bot', (req: Request, res: Response) => {
  const roomId = String(req.params.id || '').toUpperCase();
  const room = rooms.get(roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  if (room.bots.length > 0) {
    room.bots.pop();
    broadcastRoomLobby(room);
  }
  res.json({ ok: true, bots: room.bots });
});

// 5. Start Game
app.post('/api/rooms/:id/start', (req: Request, res: Response) => {
  const roomId = String(req.params.id || '').toUpperCase();
  const room = rooms.get(roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const participants = getRoomParticipants(room);
  if (participants.length < 2) {
    res.status(400).json({ error: 'At least 2 players/bots required' });
    return;
  }

  const engine = new GameEngine(participants, room.totalRounds);
  engine.startNewRound();
  room.engine = engine;

  broadcastRoomState(room);
  triggerRoomBotIfNeeded(room);
  res.json({ ok: true });
});

// 6. Client Intent
app.post('/api/rooms/:id/intent', (req: Request, res: Response) => {
  const roomId = String(req.params.id || '').toUpperCase();
  const room = rooms.get(roomId);
  const clientId = String(req.query.id || '');
  const token = String(req.query.token || '');

  if (!room || !room.engine) {
    res.status(400).json({ error: 'Game not active' });
    return;
  }

  const client = room.clients.get(clientId);
  if (!client || client.token !== token) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  const intent = req.body;
  const ok = room.engine.processIntent(clientId, intent);
  if (ok) {
    broadcastRoomState(room);
    triggerRoomBotIfNeeded(room);
  }
  res.json({ ok });
});

// 7. Next Round
app.post('/api/rooms/:id/next-round', (req: Request, res: Response) => {
  const roomId = String(req.params.id || '').toUpperCase();
  const room = rooms.get(roomId);
  if (!room || !room.engine) {
    res.status(400).json({ error: 'Game not active' });
    return;
  }
  room.engine.proceedToNextRound();
  broadcastRoomState(room);
  triggerRoomBotIfNeeded(room);
  res.json({ ok: true });
});

// Mount Vite or Serve Static Dist
async function startServer() {
  const port = 3000;
  const host = '0.0.0.0';

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host, port },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, host, () => {
    console.log(`[Haft Khabis VIP] Server listening on http://${host}:${port}`);
  });
}

startServer();
