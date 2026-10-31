import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Card,
  GameState,
  Player,
  Suit,
  SUIT_INFO,
  getCardImageSrc,
  CARD_BACK_SRC,
  canPlayCard,
  sortHandCards,
} from './types';
import { GameEngine } from './engine/GameEngine';
import { sounds } from './audio/sound';
import { RulesModal } from './components/RulesModal';
import { ScoreModal } from './components/ScoreModal';
import { SuitModal } from './components/SuitModal';
import { GivePenaltyModal } from './components/GivePenaltyModal';
import { AvatarPickerModal } from './components/AvatarPickerModal';
import { getAvatar } from './data/avatars';
import { QRCodeView } from './components/QRCodeView';
import { flyCard } from './utils/animations';
import {
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  BookOpen,
  Wifi,
  Bot,
  RotateCw,
  RotateCcw,
  Flame,
  QrCode as QrCodeIcon,
  RefreshCw,
  Smile,
} from 'lucide-react';

const BOT_NAMES = ['سینا (بات)', 'آریا (بات)', 'مریم (بات)', 'پرهام (بات)', 'رویا (بات)', 'کیان (بات)'];
const AVATAR_COLORS = ['#e57373', '#64b5f6', '#ba68c8', '#ffb74d', '#4db6ac', '#a1887f'];

type LobbyState = 'MENU' | 'HOST_LOBBY' | 'CLIENT_CONNECT' | 'BOT_CONFIG' | 'IN_GAME';

export const App: React.FC = () => {
  const [lobbyState, setLobbyState] = useState<LobbyState>('MENU');
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem('hk_name') || 'بازیکن ۱';
    } catch {
      return 'بازیکن ۱';
    }
  });

  const [playerAvatar, setPlayerAvatar] = useState<string>(() => {
    try {
      return localStorage.getItem('hk_avatar') || 'avatar_1';
    } catch {
      return 'avatar_1';
    }
  });
  const [showAvatarModal, setShowAvatarModal] = useState<boolean>(false);

  const [roundsInput, setRoundsInput] = useState<string>('5');
  const [musicOn, setMusicOn] = useState<boolean>(sounds.musicEnabled);
  const [sfxOn, setSfxOn] = useState<boolean>(sounds.soundEffectsEnabled);

  // Modals
  const [showRules, setShowRules] = useState<boolean>(false);
  const [showScoreModal, setShowScoreModal] = useState<boolean>(false);

  // Host & Client LAN/Room State
  const [roomId, setRoomId] = useState<string>('');
  const [targetIpOrCode, setTargetIpOrCode] = useState<string>('192.168.43.1');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [isMultiplayer, setIsMultiplayer] = useState<boolean>(false);
  const [connectedNames, setConnectedNames] = useState<string[]>([]);
  const [myClientId, setMyClientId] = useState<string>('');
  const [myToken, setMyToken] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Single player bot config
  const [botCount, setBotCount] = useState<number>(3); // 2, 3, or 4 players

  // Game Engine & Animation Refs
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const myPlayerIdRef = useRef<string>('human_player');
  const discardPileRef = useRef<HTMLDivElement | null>(null);
  const drawPileRef = useRef<HTMLDivElement | null>(null);
  const handRef = useRef<HTMLDivElement | null>(null);
  const opponentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevGameStateRef = useRef<GameState | null>(null);

  // Catch Tak-Kard timer
  const [catchReady, setCatchReady] = useState<boolean>(false);
  const catchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleNameChange = (val: string) => {
    const cleaned = val.slice(0, 20);
    setPlayerName(cleaned);
    try {
      localStorage.setItem('hk_name', cleaned);
    } catch {
      // ignore
    }
  };

  const toggleMusic = () => {
    const state = sounds.toggleMusic();
    setMusicOn(state);
  };

  const toggleSfx = () => {
    const state = sounds.toggleSoundEffects();
    setSfxOn(state);
  };

  const handleAvatarChange = (avatarId: string) => {
    setPlayerAvatar(avatarId);
    try {
      localStorage.setItem('hk_avatar', avatarId);
    } catch {
      // ignore
    }
  };

  // Start Offline Solo Game with Bots
  const startSoloGame = (chosenBots = botCount) => {
    sounds.startMusic();
    sounds.playShuffle();
    setTimeout(() => {
      sounds.playCardDeal();
    }, 450);
    const humanName = playerName.trim() || 'شما';
    myPlayerIdRef.current = 'human_player';

    const participants = [
      { id: 'human_player', name: humanName, avatarId: playerAvatar, isBot: false },
      ...Array.from({ length: chosenBots }).map((_, i) => ({
        id: `bot_${i + 1}`,
        name: BOT_NAMES[i] || `ربات ${i + 1}`,
        avatarId: `avatar_${((i + 1) % 10) + 1}`,
        isBot: true,
      })),
    ];

    const rounds = Math.max(1, Math.min(50, parseInt(roundsInput, 10) || 5));
    const engine = new GameEngine(participants, rounds);
    engine.startNewRound();
    engineRef.current = engine;
    setGameState({ ...engine.state });
    setIsMultiplayer(false);
    setLobbyState('IN_GAME');
  };

  // Bot Turn Automation in Solo Mode
  useEffect(() => {
    if (lobbyState !== 'IN_GAME' || isMultiplayer || !gameState || !engineRef.current) return;
    const engine = engineRef.current;
    if (gameState.isRoundOver || gameState.isGameOver) return;

    const currentPlayer = gameState.players[gameState.currentTurnIndex];
    const isBotTurn = currentPlayer?.isBot;

    let timeout: NodeJS.Timeout | null = null;
    if (isBotTurn || (gameState.catchTargetId && !gameState.catchTargetId.startsWith('bot_'))) {
      const delay = isBotTurn ? 900 : 2100;
      timeout = setTimeout(() => {
        if (!engineRef.current) return;
        const changed = engineRef.current.stepBotIfNeeded();
        if (changed) {
          setGameState({ ...engineRef.current.state });
        }
      }, delay);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [gameState, lobbyState, isMultiplayer]);

  // Catch Tak Kard 2-second timer
  useEffect(() => {
    if (!gameState) {
      setCatchReady(false);
      return;
    }
    const target = gameState.catchTargetId;
    if (target && gameState.pendingAction === 'NONE') {
      if (catchTimerRef.current) clearTimeout(catchTimerRef.current);
      catchTimerRef.current = setTimeout(() => {
        setCatchReady(true);
      }, 1900);
    } else {
      setCatchReady(false);
    }
    return () => {
      if (catchTimerRef.current) clearTimeout(catchTimerRef.current);
    };
  }, [gameState?.catchTargetId, gameState?.pendingAction, gameState?.currentTurnIndex]);

  // Round over / Game over sound & modal
  useEffect(() => {
    if (gameState?.isRoundOver) {
      if (gameState.isGameOver) {
        sounds.playGameWin();
      } else {
        sounds.playRoundWin();
      }
      setShowScoreModal(true);
    }
  }, [gameState?.isRoundOver, gameState?.isGameOver]);

  // Card Flight Animations & Sound Routing (پرتاب کارت، خنده جوکر، رعدوبرق ۷، ترمز شاه، بوق اتوبوس تک، کشیدن از بانک)
  useEffect(() => {
    const prev = prevGameStateRef.current;
    const curr = gameState;
    prevGameStateRef.current = curr;

    if (!prev || !curr) return;
    if (prev.currentRound !== curr.currentRound || prev.isRoundOver) return;

    const top = curr.topCard;
    const topChanged = !!top && (!prev.topCard || prev.topCard.id !== top.id);

    // Calculate hand deltas for each player
    const deltas = curr.players.map((p) => {
      const prevP = prev.players.find((x) => x.id === p.id);
      return {
        id: p.id,
        diff: p.hand.length - (prevP ? prevP.hand.length : p.hand.length),
      };
    });

    const shrunken = deltas.filter((x) => x.diff < 0);
    // 1. Play/Throw Card into Discard Pile with Special Sound Effects
    if (topChanged && shrunken.length > 0) {
      const isKingDefense = top.rank === 'KING' && prev.sevenChainPenalty > 0;
      if (top.rank === 'JOKER') {
        sounds.playJoker(); // خنده جوکر
      } else if (top.rank === 'ACE') {
        sounds.playSkip(); // بوق اتوبوس برای تک و رد شدن نوبت
      } else if (top.rank === 'SEVEN') {
        sounds.playSevenChain(); // رعد و برق کوتاه کارت ۷
      } else if (isKingDefense) {
        sounds.playKingDefense(); // زیپ و ترمز دفاع شاه در برابر ۷
      } else {
        sounds.playCardThrow(); // صدای انداختن کارت روی میز
      }

      const moverId = shrunken[0].id;
      let fromRect: DOMRect | null = null;
      if (moverId === myPlayerIdRef.current) {
        fromRect = handRef.current?.getBoundingClientRect() || null;
      } else {
        fromRect = opponentRefs.current[moverId]?.getBoundingClientRect() || null;
      }
      const toRect = discardPileRef.current?.getBoundingClientRect() || null;
      flyCard(fromRect, toRect, getCardImageSrc(top), {
        spin: top.id.charCodeAt(0) % 2 === 0 ? 14 : -14,
        duration: 420,
      });
    }

    // 2. Draw Cards from Bank
    const grew = deltas.filter((x) => x.diff > 0);
    const deckMoved = prev.deckCount !== curr.deckCount;
    if (grew.length > 0 && deckMoved) {
      sounds.playDrawCard(); // کشیدن کارت از بانک
      grew.forEach((item) => {
        const isMe = item.id === myPlayerIdRef.current;
        const toRect = isMe
          ? handRef.current?.getBoundingClientRect() || null
          : opponentRefs.current[item.id]?.getBoundingClientRect() || null;
        const fromRect = drawPileRef.current?.getBoundingClientRect() || null;
        const count = Math.min(item.diff, 4);
        for (let k = 0; k < count; k++) {
          flyCard(fromRect, toRect, CARD_BACK_SRC, {
            delay: k * 110,
            spin: k % 2 === 0 ? 8 : -8,
            duration: 380,
          });
        }
      });
    }

    // 3. Card 2 Penalty Given to Player
    if (!topChanged && shrunken.length > 0 && grew.length > 0) {
      sounds.playCardThrow();
      const giverId = shrunken[0].id;
      const receiverId = grew[0].id;
      const fromRect =
        giverId === myPlayerIdRef.current
          ? handRef.current?.getBoundingClientRect() || null
          : opponentRefs.current[giverId]?.getBoundingClientRect() || null;
      const toRect =
        receiverId === myPlayerIdRef.current
          ? handRef.current?.getBoundingClientRect() || null
          : opponentRefs.current[receiverId]?.getBoundingClientRect() || null;
      flyCard(fromRect, toRect, CARD_BACK_SRC, {
        spin: 10,
        duration: 420,
      });
    }

    // 4. Turn changed to Human Player
    const myId = myPlayerIdRef.current;
    if (
      prev.currentTurnIndex !== curr.currentTurnIndex &&
      curr.players[curr.currentTurnIndex]?.id === myId &&
      !curr.isRoundOver &&
      !curr.isGameOver
    ) {
      sounds.playYourTurn(); // رسیدن نوبت به شما
    }

    // 5. Tak declaration and caught triggers
    if (
      curr.statusMessage !== prev.statusMessage &&
      curr.statusMessage.includes('اعلام کرد: تک کارت') &&
      !curr.statusMessage.includes(playerName)
    ) {
      sounds.playTakDeclare();
    }
    if (
      curr.statusMessage !== prev.statusMessage &&
      curr.statusMessage.includes('تک نگفت')
    ) {
      sounds.playTakCaught();
    }
  }, [gameState, playerName]);

  // Player action handlers
  const handlePlayCard = (cardId: string) => {
    if (!gameState) return;
    const myId = myPlayerIdRef.current;
    if (isMultiplayer) {
      sendMultiplayerIntent({ t: 'play', cardId });
      return;
    }

    const cur = gameState.players[gameState.currentTurnIndex];
    if (cur.id !== myId) {
      sounds.playError();
      showToast('هنوز نوبت شما نیست!');
      return;
    }

    if (!engineRef.current) return;
    const ok = engineRef.current.processIntent(myId, { t: 'play', cardId });
    if (ok) {
      setGameState({ ...engineRef.current.state });
    } else {
      sounds.playError();
      showToast('این کارت طبق قوانین قابل انداختن نیست!');
    }
  };

  const handleDrawCard = () => {
    if (!gameState) return;
    const myId = myPlayerIdRef.current;
    if (isMultiplayer) {
      sendMultiplayerIntent({ t: 'draw' });
      return;
    }

    const cur = gameState.players[gameState.currentTurnIndex];
    if (cur.id !== myId) {
      sounds.playError();
      showToast('هنوز نوبت شما نیست!');
      return;
    }

    if (!engineRef.current) return;
    const ok = engineRef.current.processIntent(myId, { t: 'draw' });
    if (ok) {
      setGameState({ ...engineRef.current.state });
    } else {
      sounds.playError();
    }
  };

  const handlePassTurn = () => {
    const myId = myPlayerIdRef.current;
    if (isMultiplayer) {
      sendMultiplayerIntent({ t: 'pass' });
      return;
    }
    if (!engineRef.current) return;
    const ok = engineRef.current.processIntent(myId, { t: 'pass' });
    if (ok) {
      sounds.playTone(300, 'sine', 100);
      setGameState({ ...engineRef.current.state });
    }
  };

  const handleEndEightBonus = () => {
    const myId = myPlayerIdRef.current;
    if (isMultiplayer) {
      sendMultiplayerIntent({ t: 'eight' });
      return;
    }
    if (!engineRef.current) return;
    const ok = engineRef.current.processIntent(myId, { t: 'eight' });
    if (ok) {
      setGameState({ ...engineRef.current.state });
    }
  };

  const handleDeclareTak = () => {
    const myId = myPlayerIdRef.current;
    if (isMultiplayer) {
      sendMultiplayerIntent({ t: 'tak' });
      return;
    }
    if (!engineRef.current) return;
    const ok = engineRef.current.processIntent(myId, { t: 'tak' });
    if (ok) {
      sounds.playTakDeclare();
      showToast('اعلام تک کارت با موفقیت ثبت شد!');
      setGameState({ ...engineRef.current.state });
    }
  };

  const handleCatchTak = () => {
    const myId = myPlayerIdRef.current;
    if (isMultiplayer) {
      sendMultiplayerIntent({ t: 'catch' });
      return;
    }
    if (!engineRef.current) return;
    const ok = engineRef.current.processIntent(myId, { t: 'catch' });
    if (ok) {
      sounds.playTakCaught();
      setGameState({ ...engineRef.current.state });
    }
  };

  const handleSelectSuit = (suit: Suit) => {
    const myId = myPlayerIdRef.current;
    if (isMultiplayer) {
      sendMultiplayerIntent({ t: 'suit', suit });
      return;
    }
    if (!engineRef.current) return;
    const ok = engineRef.current.processIntent(myId, { t: 'suit', suit });
    if (ok) {
      sounds.playTone(520, 'sine', 120);
      setGameState({ ...engineRef.current.state });
    }
  };

  const handleGivePenalty = (cardId: string, targetId: string) => {
    const myId = myPlayerIdRef.current;
    if (isMultiplayer) {
      sendMultiplayerIntent({ t: 'give', cardId, target: targetId });
      return;
    }
    if (!engineRef.current) return;
    const ok = engineRef.current.processIntent(myId, { t: 'give', cardId, target: targetId });
    if (ok) {
      setGameState({ ...engineRef.current.state });
    }
  };

  const handleNextRound = () => {
    if (isMultiplayer) {
      fetch(`/api/rooms/${roomId}/next-round`, { method: 'POST' }).catch(() => {});
      return;
    }
    if (!engineRef.current) return;
    sounds.playShuffle();
    setTimeout(() => {
      sounds.playCardDeal();
    }, 450);
    engineRef.current.proceedToNextRound();
    setGameState({ ...engineRef.current.state });
  };

  // ---------------- Hotspot / LAN Multiplayer Connection ----------------
  const sseRef = useRef<EventSource | null>(null);

  const startHostTable = async () => {
    sounds.startMusic();
    const name = playerName.trim() || 'میزبان';
    const totalRounds = parseInt(roundsInput, 10) || 5;
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: name, totalRounds }),
      });
      const data = await res.json();
      if (data.roomId) {
        setRoomId(data.roomId);
        setIsHost(true);
        setIsMultiplayer(true);
        connectToTable(data.roomId, name);
        setLobbyState('HOST_LOBBY');
      }
    } catch {
      showToast('خطا در راه‌اندازی میزبان');
    }
  };

  const joinTable = async (codeOrIp: string) => {
    sounds.startMusic();
    setIsConnecting(true);
    let target = codeOrIp.trim().toUpperCase();
    const name = playerName.trim() || 'بازیکن';

    // If using auto-connect or default hotspot gateway IP, find active table automatically
    if (!target || target === '192.168.43.1') {
      try {
        const res = await fetch('/api/rooms/latest');
        const data = await res.json();
        if (data.roomId) {
          target = data.roomId;
        } else {
          showToast('هیچ میزی پیدا نشد. میزبان باید ابتدا «ساخت میز» را بزند.');
          setIsConnecting(false);
          return;
        }
      } catch {
        showToast('خطا در یافتن میزبان.');
        setIsConnecting(false);
        return;
      }
    }

    setRoomId(target);
    setIsHost(false);
    setIsMultiplayer(true);
    connectToTable(target, name);
  };

  const connectToTable = (rId: string, name: string) => {
    if (sseRef.current) sseRef.current.close();

    const es = new EventSource(`/api/rooms/${rId}/events?name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(playerAvatar)}`);
    sseRef.current = es;

    es.addEventListener('welcome', (e) => {
      const d = JSON.parse(e.data);
      setMyClientId(d.id);
      myPlayerIdRef.current = d.id;
      setMyToken(d.token);
      setIsConnecting(false);
      if (!isHost) setLobbyState('CLIENT_CONNECT');
    });

    es.addEventListener('lobby', (e) => {
      const d = JSON.parse(e.data);
      setConnectedNames(d.names || []);
    });

    es.addEventListener('state', (e) => {
      const st = JSON.parse(e.data);
      setGameState(st);
      setLobbyState('IN_GAME');
    });

    es.onerror = () => {
      setIsConnecting(false);
      showToast('اتصال به میزبان برقرار نشد. اطمینان حاصل کنید میزبان «ساخت میز» را زده است.');
    };
  };

  const handleAddBot = async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/add-bot`, { method: 'POST' });
      const d = await res.json();
      if (d.error) showToast(d.error);
    } catch {
      showToast('خطا در افزودن ربات');
    }
  };

  const handleRemoveBot = async () => {
    if (!roomId) return;
    try {
      await fetch(`/api/rooms/${roomId}/remove-bot`, { method: 'POST' });
    } catch {
      showToast('خطا در حذف ربات');
    }
  };

  const startMultiplayerGame = async () => {
    try {
      await fetch(`/api/rooms/${roomId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: myToken }),
      });
    } catch {
      showToast('خطا در شروع بازی');
    }
  };

  const sendMultiplayerIntent = (intent: any) => {
    if (!roomId || !myClientId) return;
    fetch(`/api/rooms/${roomId}/intent?id=${encodeURIComponent(myClientId)}&token=${encodeURIComponent(myToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intent),
    }).catch(() => {});
  };

  const leaveTable = () => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    engineRef.current = null;
    setGameState(null);
    setLobbyState('MENU');
    setIsMultiplayer(false);
  };

  const myPlayer = useMemo(() => {
    if (!gameState) return null;
    const myId = myPlayerIdRef.current;
    return gameState.players.find((p) => p.id === myId) || gameState.players[0];
  }, [gameState]);

  // دست مرتب‌شده: تناوب رنگ خال‌ها (پیک، دل، گشنیز، خشت) و رتبه‌ها از بالا به پایین (تک تا ۲)
  const sortedHand = useMemo(() => {
    if (!myPlayer) return [];
    return sortHandCards(myPlayer.hand);
  }, [myPlayer?.hand]);

  const isMyTurn = useMemo(() => {
    if (!gameState || !myPlayer) return false;
    const cur = gameState.players[gameState.currentTurnIndex];
    return cur?.id === myPlayer.id;
  }, [gameState, myPlayer]);

  const nextPlayer = useMemo(() => {
    if (!gameState || !gameState.players || gameState.players.length === 0) return null;
    const total = gameState.players.length;
    const curIdx = gameState.currentTurnIndex;
    const step = gameState.direction;
    const nextIdx = (curIdx + step + total) % total;
    return gameState.players[nextIdx];
  }, [gameState]);

  const opponents = useMemo(() => {
    if (!gameState || !myPlayer) return [];
    const count = gameState.players.length;
    const myIdx = gameState.players.findIndex((p) => p.id === myPlayer.id);
    const list: Player[] = [];
    for (let k = 1; k < count; k++) {
      list.push(gameState.players[(myIdx + k) % count]);
    }
    return list;
  }, [gameState, myPlayer]);

  const topCardTilt = useMemo(() => {
    if (!gameState?.topCard) return 0;
    const hash = gameState.topCard.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return ((hash % 16) - 8) * 1.5;
  }, [gameState?.topCard?.id]);

  // Current URL for QR code
  const currentWebUrl = useMemo(() => {
    return window.location.href;
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-radial-gradient text-white select-none">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-black/85 border border-[#ffd54f]/50 text-[#ffe082] rounded-full shadow-2xl text-xs md:text-sm font-bold flex items-center gap-2 animate-bounce">
          <span>⚠️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ===================== VIEW 1: AUTHENTIC LOBBY (منوی اصلی برنامه) ===================== */}
      {lobbyState === 'MENU' && (
        <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto p-4 max-w-lg mx-auto w-full">
          {/* Top music toggle */}
          <div className="w-full flex justify-between items-center mb-1">
            <button
              onClick={() => setShowRules(true)}
              className="text-xs text-[#ffd54f] flex items-center gap-1 hover:underline font-bold"
            >
              <BookOpen className="w-4 h-4" />
              قوانین هفت خبیث
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMusic}
                className="p-1.5 rounded-full bg-black/40 border border-white/20 text-white/80 hover:text-white"
                title="موسیقی زمینه"
              >
                {musicOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
              </button>
              <button
                onClick={toggleSfx}
                className="p-1.5 rounded-full bg-black/40 border border-white/20 text-white/80 hover:text-white"
                title="افکت صوتی"
              >
                {sfxOn ? <Bell className="w-4 h-4 text-emerald-400" /> : <BellOff className="w-4 h-4 text-gray-500" />}
              </button>
            </div>
          </div>

          {/* Decorative Hero Cards (آس پیک، ۷ دل، جوکر - مثل برنامه اصلی) */}
          <div className="h-28 w-full flex items-center justify-center relative my-1">
            <img
              src="/cards/card_spades_ace.png"
              alt="Ace"
              className="w-16 rounded shadow-lg absolute -rotate-12 -translate-x-12 translate-y-1"
            />
            <img
              src="/cards/card_hearts_7.png"
              alt="Seven"
              className="w-16 rounded shadow-2xl absolute z-10 -translate-y-1"
            />
            <img
              src="/cards/card_joker_red.png"
              alt="Joker"
              className="w-16 rounded shadow-lg absolute rotate-12 translate-x-12 translate-y-1"
            />
          </div>

          <h1 className="text-4xl font-black text-[#ffd54f] drop-shadow-md text-center mt-1">
            هفت خبیث
          </h1>
          <p className="text-xs text-white/80 text-center mb-4">
            بازی چندنفره‌ی آفلاین با هات‌اسپات • ۲ تا ۷ نفر
          </p>

          {/* Panel 1: Name, Avatar, Rounds, Buttons */}
          <div className="w-full bg-[#062414]/75 border border-[#ffd54f]/35 rounded-2xl p-4 shadow-xl space-y-3 mb-3">
            {/* Avatar & Player Name */}
            <div className="flex items-center gap-3 p-2.5 bg-black/30 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="relative group shrink-0 cursor-pointer"
                title="تغییر عکس پروفایل"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#ffd54f] shadow-md group-hover:scale-105 active:scale-95 transition">
                  {(() => {
                    const av = getAvatar(playerAvatar);
                    return <av.svg className="w-full h-full" />;
                  })()}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-[#ffd54f] text-[#241a00] text-[9px] font-black px-1.5 py-0.5 rounded-full shadow border border-black/40">
                  تغییر
                </div>
              </button>

              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-[#ffd54f]">
                    نام و پروفایل شما:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAvatarModal(true)}
                    className="text-[11px] text-amber-300 font-bold hover:underline cursor-pointer"
                  >
                    ۱۰ آواتار با نمک
                  </button>
                </div>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="مثلاً: سارا"
                  maxLength={20}
                  className="w-full px-3 py-1.5 bg-black/30 border border-white/30 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-[#ffd54f]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">
                تعداد دست‌ها (۱ تا ۵۰) — فقط میزبان:
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={roundsInput}
                onChange={(e) => setRoundsInput(e.target.value.replace(/\D/g, '').slice(0, 2))}
                className="w-full px-3 py-2 bg-black/30 border border-white/30 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-[#ffd54f]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={startHostTable}
                className="py-3 bg-[#ffd54f] hover:bg-[#ffe082] text-[#3b2a00] font-black rounded-full shadow text-xs md:text-sm transition active:scale-95"
              >
                ساخت میز (میزبان)
              </button>
              <button
                onClick={() => {
                  setLobbyState('CLIENT_CONNECT');
                  joinTable('192.168.43.1');
                }}
                className="py-3 bg-[#1e88e5] hover:bg-[#1976d2] text-white font-black rounded-full shadow text-xs md:text-sm transition active:scale-95"
              >
                پیوستن به میز
              </button>
            </div>

            {/* AI Bot Single Player Button */}
            <div className="pt-1">
              <button
                onClick={() => setLobbyState('BOT_CONFIG')}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-full shadow text-xs flex items-center justify-center gap-1.5 transition active:scale-95 border border-emerald-400/40"
              >
                <Bot className="w-4 h-4 text-yellow-300" />
                بازی تک‌نفره با هوش مصنوعی (آفلاین بدون نیاز به اتصال)
              </button>
            </div>
          </div>

          {/* Panel 2: Authentic Hotspot Guide (عیناً متن برنامه اصلی) */}
          <div className="w-full bg-[#062414]/75 border border-[#ffd54f]/35 rounded-2xl p-4 shadow-xl text-xs space-y-1.5">
            <div className="text-sm font-bold text-[#ffd54f] mb-1 flex items-center gap-1.5">
              <Wifi className="w-4 h-4" />
              راهنمای اتصال با هات‌اسپات (نقطه اتصال)
            </div>
            <p className="text-gray-200">
              ۱. روی یکی از گوشی‌ها هات‌اسپات را روشن کنید و «ساخت میز» را بزنید.
            </p>
            <p className="text-gray-200">
              ۲. بقیه به وای‌فایِ همان هات‌اسپات وصل شوند و «پیوستن به میز» را بزنند.
            </p>
            <p className="text-gray-200">
              ۳. نیازی به اینترنت نیست؛ فقط هات‌اسپات باید روشن باشد.
            </p>
          </div>
        </div>
      )}

      {/* ===================== VIEW 2: HOST PANEL (میزبان) ===================== */}
      {lobbyState === 'HOST_LOBBY' && (
        <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto p-4 max-w-md mx-auto w-full space-y-3">
          <div className="w-full flex justify-between items-center pb-2 border-b border-white/10">
            <h2 className="text-base font-bold text-[#ffd54f]">میزبان بازی</h2>
            <button onClick={leaveTable} className="text-xs text-red-400 hover:underline">
              لغو و بازگشت
            </button>
          </div>

          {/* IP & Hotspot info */}
          <div className="w-full bg-[#062414]/75 border border-[#ffd54f]/35 rounded-2xl p-4 shadow-xl text-center space-y-1">
            <div className="text-xs font-bold text-[#ffd54f]">
              آی‌پی پیش‌فرض هات‌اسپات (نقطه اتصال):
            </div>
            <div className="text-xl font-black text-yellow-300 font-mono tracking-wider py-1">
              192.168.43.1
            </div>
            <div className="text-[11px] text-gray-300">
              دوستان به هات‌اسپات شما وصل شوند و «پیوستن به میز» را بزنند
            </div>
          </div>

          {/* QR Code Panel for Web/Browser devices */}
          <div className="w-full bg-[#062414]/75 border border-[#ffd54f]/35 rounded-2xl p-4 shadow-xl text-center space-y-2">
            <div className="text-xs font-bold text-[#ffd54f] flex items-center justify-center gap-1.5">
              <QrCodeIcon className="w-4 h-4" />
              بازی با مرورگر (مثلاً آیفون یا کامپیوتر)
            </div>
            <p className="text-[11px] text-gray-300">
              بازیکن با گوشی دیگر به وای‌فای هات‌اسپات شما وصل شود و این QR کد را اسکن کند:
            </p>
            <div className="py-1">
              <QRCodeView value={currentWebUrl} size={150} />
            </div>
          </div>

          {/* Joined Players */}
          <div className="w-full bg-[#062414]/75 border border-[#ffd54f]/35 rounded-2xl p-4 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-[#ffd54f]">
                بازیکنان حاضر در میز ({connectedNames.length}/7):
              </div>
              <span className="text-[10px] text-gray-300">حداقل ۲ نفر (انسان یا بات)</span>
            </div>

            <div className="space-y-1.5">
              {connectedNames.map((name, i) => {
                const isBot = name.includes('(بات)');
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold ${
                      isBot ? 'bg-purple-950/40 border border-purple-500/30' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] text-white font-bold"
                      style={{ backgroundColor: isBot ? '#8e24aa' : AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {isBot ? '🤖' : name.charAt(0)}
                    </div>
                    <span className="flex-1 truncate">{name}</span>
                    {i === 0 && (
                      <span className="text-[10px] text-yellow-300 bg-yellow-400/20 px-2 py-0.5 rounded">
                        میزبان
                      </span>
                    )}
                    {isBot && (
                      <span className="text-[10px] text-purple-200 bg-purple-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                        بات هوشمند
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Bot Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddBot}
                disabled={connectedNames.length >= 7}
                className="flex-1 py-2 px-3 bg-purple-700/80 hover:bg-purple-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition active:scale-95 disabled:opacity-40"
              >
                <Bot className="w-4 h-4 text-yellow-300" />
                + افزودن ربات به میز
              </button>
              <button
                onClick={handleRemoveBot}
                disabled={!connectedNames.some((n) => n.includes('(بات)'))}
                className="py-2 px-3 bg-red-900/60 hover:bg-red-800 text-red-200 font-bold rounded-xl text-xs transition active:scale-95 disabled:opacity-40"
                title="حذف آخرین ربات"
              >
                - حذف ربات
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={startMultiplayerGame}
                disabled={connectedNames.length < 2}
                className="w-full py-3 bg-[#43a047] hover:bg-[#388e3c] text-white font-black rounded-full shadow text-sm transition active:scale-95 disabled:opacity-40"
              >
                شروع بازی ({connectedNames.length} نفر)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== VIEW 3: CLIENT CONNECT PANEL (پیوستن به میز) ===================== */}
      {lobbyState === 'CLIENT_CONNECT' && (
        <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto p-4 max-w-md mx-auto w-full space-y-3">
          <div className="w-full flex justify-between items-center pb-2 border-b border-white/10">
            <h2 className="text-base font-bold text-[#ffd54f]">پیوستن به میز بازی</h2>
            <button onClick={leaveTable} className="text-xs text-gray-300 hover:text-white">
              بازگشت
            </button>
          </div>

          {connectedNames.length === 0 ? (
            <div className="w-full bg-[#062414]/75 border border-[#ffd54f]/35 rounded-2xl p-6 shadow-xl text-center space-y-3">
              <div className="animate-spin w-8 h-8 border-4 border-[#ffd54f] border-t-transparent rounded-full mx-auto"></div>
              <div className="text-sm font-bold text-white">
                در حال جستجو و اتصال به میزبان هات‌اسپات...
              </div>
              <p className="text-xs text-gray-300">
                مطمئن شوید به وای‌فای هات‌اسپات میزبان وصل شده‌اید و میزبان دکمه «ساخت میز» را زده است.
              </p>
              <button
                onClick={() => joinTable('192.168.43.1')}
                className="px-5 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-full text-xs transition"
              >
                تلاش مجدد برای اتصال
              </button>
            </div>
          ) : (
            <div className="w-full bg-[#062414]/75 border border-[#ffd54f]/35 rounded-2xl p-4 shadow-xl space-y-3 text-center">
              <div className="text-sm font-bold text-[#69f0ae] flex items-center justify-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                به میز پیوستید! منتظر شروع بازی توسط میزبان...
              </div>

              <div className="space-y-1.5 text-right mt-3">
                <div className="text-xs font-bold text-[#ffd54f] mb-1">
                  بازیکنان سر میز ({connectedNames.length}):
                </div>
                {connectedNames.map((n, idx) => {
                  const isBot = n.includes('(بات)');
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        isBot ? 'bg-purple-950/40 border border-purple-500/30' : 'bg-white/10'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white"
                        style={{ backgroundColor: isBot ? '#8e24aa' : AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                      >
                        {isBot ? '🤖' : n.charAt(0)}
                      </div>
                      <span className="flex-1 truncate">{n}</span>
                      {idx === 0 && <span className="text-[10px] text-yellow-300 bg-yellow-400/20 px-2 py-0.5 rounded">میزبان</span>}
                      {isBot && <span className="text-[10px] text-purple-200 bg-purple-500/30 px-2 py-0.5 rounded">بات</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== VIEW 4: BOT CONFIG (بازی با بات‌ها) ===================== */}
      {lobbyState === 'BOT_CONFIG' && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-md mx-auto w-full space-y-4">
          <div className="w-full bg-[#062414]/85 border border-[#ffd54f]/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h2 className="text-base font-bold text-[#ffd54f] flex items-center gap-2">
                <Bot className="w-5 h-5" />
                بازی آفلاین با هوش مصنوعی
              </h2>
              <button onClick={() => setLobbyState('MENU')} className="text-xs text-gray-300 hover:text-white">
                بازگشت
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-200 mb-2">
                تعداد کل بازیکنان سر میز:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { bots: 1, label: '۲ نفره (۱ به ۱)' },
                  { bots: 2, label: '۳ نفره' },
                  { bots: 3, label: '۴ نفره' },
                ].map((item) => (
                  <button
                    key={item.bots}
                    onClick={() => setBotCount(item.bots)}
                    className={`py-3 px-2 rounded-2xl border text-xs font-bold transition text-center ${
                      botCount === item.bots
                        ? 'bg-[#ffd54f] text-[#291e00] border-[#ffd54f] font-black shadow'
                        : 'bg-black/30 border-white/15 text-gray-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-200 mb-2">
                تعداد دست‌های بازی:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[3, 5, 7].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoundsInput(String(r))}
                    className={`py-2 rounded-2xl border text-xs font-bold transition ${
                      roundsInput === String(r)
                        ? 'bg-[#ffd54f] text-[#291e00] border-[#ffd54f]'
                        : 'bg-black/30 border-white/15 text-gray-300'
                    }`}
                  >
                    {r} دست
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => startSoloGame()}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black rounded-full shadow-lg text-sm transition active:scale-95"
            >
              شروع بازی هفت خبیث!
            </button>
          </div>
        </div>
      )}

      {/* ===================== VIEW 5: IN-GAME TABLE (میز بازی) ===================== */}
      {lobbyState === 'IN_GAME' && gameState && myPlayer && (
        <div className="flex-1 flex flex-col justify-between p-2 md:p-4 max-w-4xl mx-auto w-full h-full relative">
          {/* Top Bar Controls */}
          <div className="flex items-center justify-between gap-2 shrink-0 z-20">
            <div className="flex items-center gap-1.5">
              <button
                onClick={leaveTable}
                className="px-3 py-1.5 bg-black/40 hover:bg-black/60 rounded-full text-xs font-bold border border-white/10 transition"
              >
                خروج
              </button>
              <button
                onClick={toggleMusic}
                className="p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white/80 border border-white/10 transition"
                title="موسیقی زمینه"
              >
                {musicOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
              </button>
              <button
                onClick={toggleSfx}
                className="p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white/80 border border-white/10 transition"
                title="افکت صوتی"
              >
                {sfxOn ? <Bell className="w-4 h-4 text-emerald-400" /> : <BellOff className="w-4 h-4 text-gray-500" />}
              </button>
            </div>

            {/* Round Indicator */}
            <div className="px-3 py-1 bg-black/40 border border-[#ffd54f]/40 rounded-full text-xs font-bold text-[#ffd54f]">
              دست {gameState.currentRound} از {gameState.totalRounds}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowScoreModal(true)}
                className="px-3 py-1.5 bg-[#ffd54f] hover:bg-[#ffe082] text-[#291e00] rounded-full text-xs font-extrabold shadow transition active:scale-95"
              >
                جدول امتیاز
              </button>
              <button
                onClick={() => setShowRules(true)}
                className="p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white/80 border border-white/10 transition"
                title="قوانین"
              >
                <BookOpen className="w-4 h-4 text-yellow-300" />
              </button>
            </div>
          </div>

          {/* Opponents Section - Fixed height container to prevent layout shifting */}
          <div className="flex flex-wrap items-start justify-center gap-2 md:gap-6 my-1 shrink-0 z-10 min-h-[148px]">
            {opponents.map((opp) => {
              const isTurn = gameState.players[gameState.currentTurnIndex]?.id === opp.id;
              const isNext = nextPlayer?.id === opp.id;
              const cardCount = opp.hand.length;

              return (
                <div
                  key={opp.id}
                  ref={(el) => {
                    opponentRefs.current[opp.id] = el;
                  }}
                  className="flex flex-col items-center relative w-[80px] md:w-[88px] h-[148px] shrink-0 justify-start select-none"
                >
                  {/* Cards fan - fixed height */}
                  <div className="relative h-8 w-16 mb-0.5 shrink-0">
                    {Array.from({ length: Math.min(cardCount, 6) }).map((_, i) => {
                      const rel = i - (Math.min(cardCount, 6) - 1) / 2;
                      return (
                        <img
                          key={i}
                          src={CARD_BACK_SRC}
                          alt="card back"
                          className="absolute bottom-0 left-1/2 -ml-3 w-6 rounded shadow pointer-events-none"
                          style={{
                            transform: `translateX(${rel * 7}px) rotate(${rel * 9}deg)`,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Cute Visual Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-11 h-11 md:w-12 md:h-12 rounded-full overflow-hidden border-2 shadow-lg transition-transform ${
                        isTurn
                          ? 'border-[#ffd54f] ring-4 ring-yellow-400/50 scale-105 animate-pulse'
                          : isNext
                          ? 'border-amber-400 ring-2 ring-amber-400/40'
                          : 'border-white/40'
                      }`}
                    >
                      {(() => {
                        const av = getAvatar(opp.avatarId);
                        return <av.svg className="w-full h-full" />;
                      })()}
                    </div>
                    {/* Card count badge */}
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#1a237e] border border-[#ffd54f] rounded-full text-[10px] font-bold flex items-center justify-center shadow">
                      {cardCount}
                    </div>
                  </div>

                  {/* Opponent Name - Single Line Fixed Slot */}
                  <div className="w-full h-4 mt-1 flex items-center justify-center">
                    <span className="text-[11px] md:text-xs font-bold truncate max-w-[80px] text-center whitespace-nowrap block" title={opp.name}>
                      {opp.name}
                    </span>
                  </div>

                  {/* Status / Next Badge Slot - Fixed h-4 */}
                  <div className="w-full h-4 mt-0.5 flex items-center justify-center">
                    {isNext ? (
                      <span className="text-[9px] bg-amber-500/25 text-amber-300 border border-amber-400/40 px-1.5 py-0 rounded-full font-bold whitespace-nowrap">
                        نفر بعدی
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-300/80 whitespace-nowrap font-medium">
                        امتیاز: {opp.totalScore}
                      </span>
                    )}
                  </div>

                  {/* Catch Tak-Kard / Alert Button Slot - Fixed h-6 */}
                  <div className="w-full h-6 mt-1 flex items-center justify-center">
                    {catchReady && gameState.catchTargetId === opp.id ? (
                      <button
                        onClick={handleCatchTak}
                        className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-[10px] rounded-full shadow-lg animate-bounce whitespace-nowrap"
                      >
                        تک نگفت😁!
                      </button>
                    ) : opp.saidTakKard ? (
                      <div className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-black rounded-full animate-pulse whitespace-nowrap">
                        تک کارت!
                      </div>
                    ) : isNext ? (
                      <span className="text-[9px] text-gray-400 whitespace-nowrap font-medium">
                        امتیاز: {opp.totalScore}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Table - Fixed vertical rhythm to prevent any jumping */}
          {/* Center Table - Generous vertical rhythm so pills NEVER touch the cards */}
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[240px] my-auto select-none">

            {/* Top Indicator Row: Direction Chip + Seven Chain Alert - GENEROUS MARGIN BOTTOM (mb-6) so it never touches the cards */}
            <div className="h-7 mb-5 md:mb-6 flex items-center justify-center gap-2 w-full max-w-md">
              <div
                className={`h-7 px-3.5 rounded-full border text-xs font-bold flex items-center gap-1.5 shadow whitespace-nowrap ${
                  gameState.direction === 1
                    ? 'bg-blue-900/40 border-blue-400/50 text-blue-300'
                    : 'bg-rose-900/40 border-rose-400/50 text-rose-300'
                }`}
              >
                {gameState.direction === 1 ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 shrink-0" />
                    <span>گردش: ساعتگرد</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>گردش: پادساعتگرد</span>
                  </>
                )}
              </div>

              {gameState.sevenChainPenalty > 0 && (
                <div className="h-7 px-3.5 bg-red-600/90 text-white rounded-full text-xs font-black shadow-lg flex items-center gap-1.5 animate-pulse whitespace-nowrap">
                  <Flame className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                  <span>زنجیره ۷: {gameState.sevenChainPenalty} کارت جریمه!</span>
                </div>
              )}
            </div>

            {/* Piles Container - Clear space without overlapping top or bottom */}
            <div className="flex items-center justify-center gap-6 md:gap-10 relative z-10 py-1">
              {/* Draw Pile (Bank) */}
              <div
                ref={drawPileRef}
                onClick={handleDrawCard}
                className={`relative flex flex-col items-center cursor-pointer group transition-transform ${
                  isMyTurn && !gameState.hasDrawnThisTurn ? 'hover:scale-105 active:scale-95' : ''
                }`}
                title="کشیدن کارت از بانک"
              >
                <div
                  className={`relative w-20 h-28 md:w-24 md:h-32 rounded-lg transition-all ${
                    isMyTurn && !gameState.hasDrawnThisTurn
                      ? 'ring-4 ring-[#ffd54f] shadow-[0_0_15px_rgba(255,213,79,0.8)]'
                      : 'shadow-md'
                  }`}
                >
                  <img
                    src={CARD_BACK_SRC}
                    alt="bank stack"
                    className="absolute top-1 left-1 w-full h-full rounded-lg object-contain opacity-70"
                  />
                  <img
                    src={CARD_BACK_SRC}
                    alt="bank"
                    className="absolute top-0 left-0 w-full h-full rounded-lg object-contain shadow-lg"
                  />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/80 text-[#ffd54f] text-xs font-black rounded-full border border-yellow-400/50 whitespace-nowrap">
                    {gameState.deckCount}
                  </div>
                </div>
                <div className="text-[11px] font-bold text-gray-300 mt-1 whitespace-nowrap">
                  بانک
                </div>
              </div>

              {/* Discard Pile - 'زمین' label removed */}
              <div ref={discardPileRef} className="relative flex flex-col items-center">
                <div className="relative w-20 h-28 md:w-24 md:h-32 flex items-center justify-center">
                  <div className="absolute w-20 h-28 md:w-24 md:h-32 bg-white/20 rounded-lg -rotate-6"></div>
                  {gameState.topCard && (
                    <img
                      key={gameState.topCard.id}
                      src={getCardImageSrc(gameState.topCard)}
                      alt="top card"
                      className="relative w-full h-full rounded-lg object-contain shadow-2xl animate-pop transition-transform"
                      style={{
                        transform: `rotate(${topCardTilt}deg)`,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Active Suit Badge - Fixed-width slot to anchor piles symmetrically */}
              <div className="w-14 md:w-16 flex flex-col items-center justify-center">
                {gameState.activeSuit && gameState.activeSuit !== 'JOKER' ? (
                  <>
                    <div
                      className={`w-11 h-11 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center text-2xl font-black border-2 border-[#ffd54f] shadow-lg shrink-0 ${
                        SUIT_INFO[gameState.activeSuit].isRed ? 'text-red-600' : 'text-black'
                      }`}
                    >
                      {SUIT_INFO[gameState.activeSuit].symbol}
                    </div>
                    <div className="text-[10px] font-bold text-[#ffd54f] mt-1 whitespace-nowrap">
                      خال: {SUIT_INFO[gameState.activeSuit].title}
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {/* Status Message Box - GENEROUS MARGIN TOP (mt-6 md:mt-7) so it NEVER touches the cards above */}
            <div className="mt-6 md:mt-7 h-8 md:h-9 w-full max-w-md mx-auto px-4 bg-black/50 border border-[#ffd54f]/30 rounded-2xl flex items-center justify-center shadow overflow-hidden">
              <span
                className="text-xs md:text-sm font-bold text-[#ffe082] text-center truncate whitespace-nowrap w-full block"
                title={gameState.statusMessage}
              >
                {gameState.statusMessage}
              </span>
            </div>

            {/* In-Turn Actions - Fixed height reserved slot */}
            <div className="h-8 mt-1.5 flex items-center justify-center gap-2 w-full">
              {isMyTurn && gameState.hasDrawnThisTurn && gameState.pendingAction === 'NONE' && (
                <button
                  onClick={handlePassTurn}
                  className="px-4 py-1 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-full text-xs shadow active:scale-95 transition whitespace-nowrap"
                >
                  رد نوبت
                </button>
              )}
              {isMyTurn && gameState.pendingAction === 'EIGHT_STREAK' && (
                <button
                  onClick={handleEndEightBonus}
                  className="px-4 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-full text-xs shadow active:scale-95 transition whitespace-nowrap"
                >
                  پایان جایزه ۸
                </button>
              )}
            </div>
          </div>

          {/* Bottom Bar (Status & Player Actions) - Restored to original location right above the hand */}
          <div className="h-11 flex items-center justify-between gap-2 md:gap-3 shrink-0 my-1 z-20">
            <div className="flex items-center gap-2 min-w-0">
              {/* My Cute Avatar Button */}
              <button
                onClick={() => setShowAvatarModal(true)}
                title="تغییر عکس پروفایل"
                className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden border-2 border-[#ffd54f] shadow hover:scale-105 active:scale-95 transition shrink-0 cursor-pointer"
              >
                {(() => {
                  const av = getAvatar(myPlayer.avatarId || playerAvatar);
                  return <av.svg className="w-full h-full" />;
                })()}
              </button>

              {/* Turn & Next Player Indicator - Single line clamped */}
              <div
                className={`h-9 px-3 md:px-4 rounded-full text-xs md:text-sm font-extrabold border transition shadow flex items-center gap-2 whitespace-nowrap shrink-0 overflow-hidden ${
                  isMyTurn
                    ? 'bg-emerald-700/80 border-emerald-400 text-emerald-200 animate-pulse'
                    : 'bg-black/40 border-white/15 text-gray-300'
                }`}
              >
                <span className="truncate max-w-[110px] md:max-w-[160px] whitespace-nowrap block">
                  {isMyTurn
                    ? '⭐ نوبت شماست!'
                    : `نوبت: ${gameState.players[gameState.currentTurnIndex]?.name || ''}`}
                </span>
                <span className="text-white/30">|</span>
                <span className="text-amber-300 font-bold text-[11px] md:text-xs truncate max-w-[90px] md:max-w-[130px] whitespace-nowrap block">
                  نفر بعد: {nextPlayer?.name || '—'}
                </span>
              </div>
            </div>

            <button
              onClick={handleDeclareTak}
              disabled={myPlayer.hand.length !== 1 || myPlayer.saidTakKard}
              className={`h-9 px-3 md:px-4 rounded-full text-xs md:text-sm font-black transition shadow-lg whitespace-nowrap shrink-0 flex items-center justify-center ${
                myPlayer.hand.length === 1 && !myPlayer.saidTakKard
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-bounce cursor-pointer'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              اعلام تک کارت!
            </button>
          </div>

          {/* Player Hand Fan - Compact fan showing ~1/5th of each card */}
          <div
            ref={handRef}
            className="relative w-full h-36 md:h-42 shrink-0 flex items-end justify-center pb-2 z-20"
          >
            <div className="relative w-full max-w-2xl h-full flex items-end justify-center">
              {sortedHand.map((card, idx) => {
                const total = sortedHand.length;
                const mid = (total - 1) / 2;
                const rel = idx - mid;
                const playable = isMyTurn && canPlayCard(gameState, card);

                // Compact step: ~16px gives ~20% (1/5th) card exposure, showing rank and suit clearly
                const stepX = Math.min(16, Math.max(11, 240 / Math.max(total, 1)));
                const posX = rel * stepX;
                const angle = rel * Math.min(1.4, 12 / Math.max(total, 1));
                const posY = Math.abs(rel) * 1.5 - (playable ? 14 : 0);

                return (
                  <div
                    key={card.id}
                    onClick={() => handlePlayCard(card.id)}
                    style={{
                      transform: `translateX(${posX}px) translateY(${posY}px) rotate(${angle}deg)`,
                      zIndex: idx + 10,
                    }}
                    className={`absolute bottom-0 cursor-pointer transition-all duration-200 ease-out origin-bottom ${
                      playable
                        ? 'hover:-translate-y-8 hover:scale-110 hover:!z-50'
                        : isMyTurn
                        ? 'opacity-40 grayscale-[30%] hover:opacity-75 hover:!z-50'
                        : 'hover:-translate-y-2 hover:!z-50'
                    }`}
                  >
                    <img
                      src={getCardImageSrc(card)}
                      alt={card.rank}
                      className={`w-16 md:w-20 rounded-lg shadow-xl object-contain transition-all select-none ${
                        playable
                          ? 'ring-4 ring-[#ffd54f] shadow-[0_0_15px_rgba(255,213,79,0.9)]'
                          : ''
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modals */}
          <SuitModal
            isOpen={isMyTurn && gameState.pendingAction === 'CHOOSE_SUIT'}
            onSelect={handleSelectSuit}
            canDeclareTakKard={myPlayer.hand.length === 1 && !myPlayer.saidTakKard}
            onDeclareTakKard={handleDeclareTak}
          />

          <GivePenaltyModal
            isOpen={isMyTurn && gameState.pendingAction === 'GIVE_PENALTY_CARD'}
            myHand={sortedHand}
            otherPlayers={gameState.players.filter((p) => p.id !== myPlayer.id)}
            onConfirm={handleGivePenalty}
            canDeclareTakKard={myPlayer.hand.length === 1 && !myPlayer.saidTakKard}
            onDeclareTakKard={handleDeclareTak}
          />
        </div>
      )}

      {/* Global Rules Modal */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Global Score Modal */}
      {gameState && myPlayer && (
        <ScoreModal
          isOpen={showScoreModal}
          onClose={() => setShowScoreModal(false)}
          players={gameState.players}
          currentRound={gameState.currentRound}
          totalRounds={gameState.totalRounds}
          isRoundOver={gameState.isRoundOver}
          isGameOver={gameState.isGameOver}
          statusMessage={gameState.statusMessage}
          myId={myPlayer.id}
          onNextRound={handleNextRound}
          onRestartGame={() => startSoloGame()}
        />
      )}

      {/* Global Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={showAvatarModal}
        selectedId={playerAvatar}
        onSelect={handleAvatarChange}
        onClose={() => setShowAvatarModal(false)}
      />
    </div>
  );
};
