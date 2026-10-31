export type SoundKey =
  | 'card_throw'
  | 'card_draw'
  | 'card_deal'
  | 'shuffle'
  | 'your_turn'
  | 'error'
  | 'tak_declare'
  | 'tak_caught'
  | 'joker'
  | 'seven_chain'
  | 'skip'
  | 'king_defense'
  | 'round_win'
  | 'game_win';

class SoundManager {
  private ctx: AudioContext | null = null;
  private musicAudio: HTMLAudioElement | null = null;
  public musicEnabled: boolean = true;
  public soundEffectsEnabled: boolean = true;
  private audioBuffers: Map<SoundKey, AudioBuffer> = new Map();
  private audioElements: Map<SoundKey, HTMLAudioElement> = new Map();
  private hasUnlocked: boolean = false;

  constructor() {
    try {
      this.musicEnabled = localStorage.getItem('hk_music') !== '0';
      this.soundEffectsEnabled = localStorage.getItem('hk_sfx') !== '0';
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      const unlock = () => {
        if (this.hasUnlocked) return;
        this.initCtx();
        this.preloadSounds();
        this.hasUnlocked = true;
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    }
  }

  private initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public preloadSounds() {
    const keys: SoundKey[] = [
      'card_throw',
      'card_draw',
      'card_deal',
      'shuffle',
      'your_turn',
      'error',
      'tak_declare',
      'tak_caught',
      'joker',
      'seven_chain',
      'skip',
      'king_defense',
      'round_win',
      'game_win',
    ];

    keys.forEach((key) => {
      const url = `/sounds/${key}.wav`;
      // Pre-create HTMLAudioElement for fallback
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.audioElements.set(key, audio);

      // Also decode into Web Audio buffer for ultra-low latency playback
      if (this.ctx) {
        fetch(url)
          .then((res) => (res.ok ? res.arrayBuffer() : null))
          .then((buf) => {
            if (buf && this.ctx) {
              return this.ctx.decodeAudioData(buf);
            }
            return null;
          })
          .then((decoded) => {
            if (decoded) {
              this.audioBuffers.set(key, decoded);
            }
          })
          .catch(() => {});
      }
    });
  }

  public playSound(key: SoundKey, volume = 1.0) {
    if (!this.soundEffectsEnabled) return;
    this.initCtx();

    // 1. Try playing via AudioBuffer (zero-latency Web Audio API)
    if (this.ctx && this.audioBuffers.has(key)) {
      try {
        const buffer = this.audioBuffers.get(key)!;
        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        source.buffer = buffer;
        gain.gain.value = Math.max(0, Math.min(1.2, volume));
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);
        return;
      } catch {
        // fallback to HTMLAudioElement
      }
    }

    // 2. Fallback to HTMLAudioElement
    try {
      const cached = this.audioElements.get(key);
      const url = `/sounds/${key}.wav`;
      const audio = cached ? (cached.cloneNode(true) as HTMLAudioElement) : new Audio(url);
      audio.volume = Math.max(0, Math.min(1.0, volume));
      audio.play().catch(() => {});
    } catch {
      // ignore
    }
  }

  // Fallback synthetic tone
  public playTone(freq: number, type: OscillatorType, durationMs: number, gainVal = 0.15) {
    if (!this.soundEffectsEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + durationMs / 1000);
    } catch {
      // Audio might be blocked by browser policy
    }
  }

  // Standard Actions
  public playCardThrow() {
    this.playSound('card_throw', 0.9);
  }

  public playDrawCard() {
    this.playSound('card_draw', 0.95);
  }

  public playCardDeal() {
    this.playSound('card_deal', 0.85);
  }

  public playShuffle() {
    this.playSound('shuffle', 0.9);
  }

  public playYourTurn() {
    this.playSound('your_turn', 0.85);
  }

  public playError() {
    this.playSound('error', 0.9);
  }

  public playTakDeclare() {
    this.playSound('tak_declare', 0.95);
  }

  public playTakCaught() {
    this.playSound('tak_caught', 1.0);
  }

  // Special Card Effects
  public playJoker() {
    this.playSound('joker', 1.0); // صدای خنده جوکر
  }

  public playSevenChain() {
    this.playSound('seven_chain', 1.0); // صدای رعد و برق کوتاه کارت ۷
  }

  public playSkip() {
    this.playSound('skip', 0.95); // صدای بوق اتوبوس برای تک و رد شدن نوبت
  }

  public playKingDefense() {
    this.playSound('king_defense', 1.0); // صدای زیپ و ترمز ماشین برای دفاع با شاه
  }

  // Win Celebrations
  public playRoundWin() {
    this.playSound('round_win', 0.9);
  }

  public playGameWin() {
    this.playSound('game_win', 1.0); // پیروزی کامل با پیام هووورا
  }

  // Background Music
  public toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    try {
      localStorage.setItem('hk_music', this.musicEnabled ? '1' : '0');
    } catch {
      // ignore
    }
    if (this.musicAudio) {
      if (this.musicEnabled) {
        this.musicAudio.play().catch(() => {});
      } else {
        this.musicAudio.pause();
      }
    } else if (this.musicEnabled) {
      this.startMusic();
    }
    return this.musicEnabled;
  }

  public toggleSoundEffects(): boolean {
    this.soundEffectsEnabled = !this.soundEffectsEnabled;
    try {
      localStorage.setItem('hk_sfx', this.soundEffectsEnabled ? '1' : '0');
    } catch {
      // ignore
    }
    return this.soundEffectsEnabled;
  }

  public startMusic() {
    if (!this.musicEnabled) return;
    try {
      if (!this.musicAudio) {
        this.musicAudio = new Audio('/bg_music.mp3');
        this.musicAudio.loop = true;
        this.musicAudio.volume = 0.28;
      }
      this.musicAudio.play().catch(() => {});
    } catch {
      // ignore
    }
  }
}

export const sounds = new SoundManager();
