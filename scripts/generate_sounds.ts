import fs from 'fs';
import path from 'path';

const SAMPLE_RATE = 44100;

function createWavBuffer(samples: Float32Array): Buffer {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
  buffer.writeUInt32LE(SAMPLE_RATE, 24); // SampleRate
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // ByteRate (SampleRate * 1 * 2)
  buffer.writeUInt16LE(2, 32); // BlockAlign (1 * 2)
  buffer.writeUInt16LE(16, 34); // BitsPerSample (16)

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intVal = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
    buffer.writeInt16LE(intVal, 44 + i * 2);
  }

  return buffer;
}

// Utility audio synthesis helpers
function clamp(x: number, min = -1, max = 1) {
  return Math.max(min, Math.min(max, x));
}

// Lowpass filter single pole
function lowpass(input: Float32Array, cutoff: number): Float32Array {
  const output = new Float32Array(input.length);
  const rc = 1.0 / (2 * Math.PI * cutoff);
  const dt = 1.0 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  let prev = 0;
  for (let i = 0; i < input.length; i++) {
    prev = prev + alpha * (input[i] - prev);
    output[i] = prev;
  }
  return output;
}

// Bandpass filter
function bandpass(input: Float32Array, freq: number, q: number): Float32Array {
  const output = new Float32Array(input.length);
  const w0 = (2 * Math.PI * freq) / SAMPLE_RATE;
  const alpha = Math.sin(w0) / (2 * q);
  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    output[i] = y0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
  }
  return output;
}

// 1. card_throw: Fast card whoosh + table slap (thump + felt friction snap)
function generateCardThrow(): Float32Array {
  const duration = 0.22;
  const n = Math.floor(SAMPLE_RATE * duration);
  const buf = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    // whoosh noise (0 to 0.12s)
    let whoosh = 0;
    if (t < 0.12) {
      const env = Math.sin((t / 0.12) * Math.PI);
      whoosh = (Math.random() * 2 - 1) * env * 0.35;
    }

    // snap thump at 0.08s
    let snap = 0;
    if (t >= 0.08) {
      const dt = t - 0.08;
      const decay = Math.exp(-dt * 45);
      const lowThump = Math.sin(2 * Math.PI * (130 - dt * 200) * dt) * decay * 0.7;
      const crispNoise = (Math.random() * 2 - 1) * Math.exp(-dt * 90) * 0.5;
      snap = lowThump + crispNoise;
    }

    buf[i] = clamp(whoosh + snap);
  }
  return lowpass(buf, 5500);
}

// 2. card_draw: Smooth card friction slide + delicate release flick
function generateCardDraw(): Float32Array {
  const duration = 0.25;
  const n = Math.floor(SAMPLE_RATE * duration);
  const buf = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    // sliding friction noise with gentle rise
    const env = Math.pow(Math.sin((t / duration) * Math.PI), 1.2);
    const noise = (Math.random() * 2 - 1) * 0.45;
    const tone = Math.sin(2 * Math.PI * (450 + t * 400) * t) * 0.15;
    // flick at end
    const flick = t > 0.18 ? (Math.random() * 2 - 1) * Math.exp(-(t - 0.18) * 80) * 0.3 : 0;

    buf[i] = clamp((noise + tone) * env + flick);
  }
  return bandpass(buf, 2200, 1.2);
}

// 3. card_deal: Rapid rhythmic flutter of dealing cards
function generateCardDeal(): Float32Array {
  const duration = 0.65;
  const n = Math.floor(SAMPLE_RATE * duration);
  const buf = new Float32Array(n);
  const cardTimes = [0.0, 0.12, 0.24, 0.36, 0.48];

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    cardTimes.forEach((ct, idx) => {
      if (t >= ct && t < ct + 0.1) {
        const dt = t - ct;
        const decay = Math.exp(-dt * 55);
        const pitch = 220 + idx * 30;
        const snap = Math.sin(2 * Math.PI * pitch * dt) * decay * 0.4;
        const noise = (Math.random() * 2 - 1) * Math.exp(-dt * 120) * 0.35;
        s += snap + noise;
      }
    });
    buf[i] = clamp(s);
  }
  return lowpass(buf, 4800);
}

// 4. shuffle: Rich casino deck shuffle (riffle flutter + cascading bridge)
function generateShuffle(): Float32Array {
  const duration = 1.05;
  const n = Math.floor(SAMPLE_RATE * duration);
  const buf = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let val = 0;

    // Phase 1: Rapid riffle clicks (0 to 0.6s)
    if (t < 0.65) {
      const clickRate = 45 + Math.sin(t * 10) * 15;
      const clickPhase = (t * clickRate) % 1;
      const clickEnv = Math.exp(-clickPhase * 18);
      const noise = (Math.random() * 2 - 1) * clickEnv * 0.6;
      val = noise * Math.sin((t / 0.65) * Math.PI);
    }
    // Phase 2: Bridge cascade roll (0.65 to 1.05s)
    else {
      const dt = t - 0.65;
      const cascadeRate = 60 - dt * 40;
      const phase = (dt * cascadeRate) % 1;
      const decay = Math.exp(-phase * 15) * Math.exp(-dt * 3.5);
      const tone = Math.sin(2 * Math.PI * (350 - dt * 150) * dt) * 0.2;
      val = ((Math.random() * 2 - 1) * 0.5 + tone) * decay;
    }

    buf[i] = clamp(val * 0.85);
  }
  return lowpass(buf, 4200);
}

// 5. your_turn: Pleasant melodious notification chime (C5 + E5 + G5 -> C6 chime chord)
function generateYourTurn(): Float32Array {
  const duration = 0.55;
  const n = Math.floor(SAMPLE_RATE * duration);
  const buf = new Float32Array(n);

  // Two sequential chime notes: G5 (784Hz) -> C6 (1046Hz)
  const notes = [
    { start: 0.0, freq: 783.99, dur: 0.3 },
    { start: 0.12, freq: 1046.5, dur: 0.42 },
  ];

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    notes.forEach((note) => {
      if (t >= note.start) {
        const dt = t - note.start;
        const decay = Math.exp(-dt * 7.5);
        // bell chime harmonics: fundamental + 2nd + 3rd harmonic
        const f1 = Math.sin(2 * Math.PI * note.freq * dt);
        const f2 = Math.sin(2 * Math.PI * note.freq * 2.01 * dt) * 0.35;
        const f3 = Math.sin(2 * Math.PI * note.freq * 3.02 * dt) * 0.15;
        s += (f1 + f2 + f3) * decay * 0.45;
      }
    });
    buf[i] = clamp(s);
  }
  return buf;
}

// 6. error: Distinctive invalid move buzz-blip
function generateError(): Float32Array {
  const duration = 0.28;
  const n = Math.floor(SAMPLE_RATE * duration);
  const buf = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    // double short buzz
    const toneFreq = t < 0.13 ? 180 : (t >= 0.15 && t < 0.27 ? 140 : 0);
    if (toneFreq === 0) continue;
    const subT = t < 0.13 ? t : t - 0.15;
    const env = Math.sin((subT / 0.12) * Math.PI);
    // Sawtooth blend
    const saw = ((subT * toneFreq * 2) % 2) - 1;
    const square = Math.sin(2 * Math.PI * toneFreq * subT) > 0 ? 0.6 : -0.6;
    buf[i] = clamp((saw * 0.6 + square * 0.4) * env * 0.55);
  }
  return buf;
}

// 7. tak_declare: Energetic bell ping announcement
function generateTakDeclare(): Float32Array {
  const duration = 0.5;
  const n = Math.floor(SAMPLE_RATE * duration);
  const buf = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    // Crisp energetic bell ding at 1318.5Hz (E6) with bright high harmonic
    const decay = Math.exp(-t * 8);
    const f1 = Math.sin(2 * Math.PI * 1318.5 * t);
    const f2 = Math.sin(2 * Math.PI * 2637 * t) * 0.4;
    const f3 = Math.sin(2 * Math.PI * 3950 * t) * 0.2;
    // initial strike click
    const click = t < 0.015 ? (Math.random() * 2 - 1) * Math.exp(-t * 200) * 0.5 : 0;
    buf[i] = clamp(((f1 + f2 + f3) * 0.5 + click) * decay);
  }
  return buf;
}

// 8. tak_caught: Comedic slip whistle / caught slide (wah-wah drop)
function generateTakCaught(): Float32Array {
  const duration = 0.65;
  const n = Math.floor(SAMPLE_RATE * duration);
  const buf = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    // Descending slide whistle from 750Hz down to 210Hz with vibrato
    const baseFreq = 750 - Math.pow(t / duration, 0.7) * 540;
    const vibrato = Math.sin(2 * Math.PI * 14 * t) * 25;
    const freq = Math.max(120, baseFreq + vibrato);
    const env = Math.sin(Math.pow(t / duration, 0.6) * Math.PI);
    // Soft triangle / sine mix
    const tri = 2 * Math.abs(2 * ((t * freq) % 1) - 1) - 1;
    const sin = Math.sin(2 * Math.PI * freq * t);
    buf[i] = clamp((tri * 0.5 + sin * 0.5) * env * 0.6);
  }
  return buf;
}

// 9. joker: Comedic clown/joker laughter ("Ha-ha-ha-ha-hee!")
function generateJoker(): Float32Array {
  const duration = 1.3;
  const n = Math.floor(SAMPLE_RATE * duration);
  const buf = new Float32Array(n);

  // 6 laughter bursts with pitch variations: Ha - Ha - Ha - Ha - Hee - Heee!
  const bursts = [
    { t0: 0.04, dur: 0.14, pitch: 480, f1: 750, f2: 1200 }, // Ha!
    { t0: 0.22, dur: 0.15, pitch: 540, f1: 750, f2: 1250 }, // Ha!
    { t0: 0.42, dur: 0.15, pitch: 600, f1: 780, f2: 1300 }, // Ha!
    { t0: 0.62, dur: 0.16, pitch: 680, f1: 820, f2: 1400 }, // Ha!
    { t0: 0.83, dur: 0.18, pitch: 780, f1: 500, f2: 1900 }, // Hee!
    { t0: 1.05, dur: 0.22, pitch: 720, f1: 450, f2: 2100 }, // Heee!
  ];

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    bursts.forEach((b) => {
      if (t >= b.t0 && t < b.t0 + b.dur) {
        const dt = t - b.t0;
        // Laugh burst envelope with slight tremolo
        const tremolo = 1 + 0.3 * Math.sin(2 * Math.PI * 18 * dt);
        const env = Math.sin((dt / b.dur) * Math.PI) * tremolo;
        // Vocal glottal wave (buzz with pitch drop in each ha!)
        const p = b.pitch - dt * 250;
        const phase = (dt * p) % 1;
        const glottal = phase < 0.2 ? phase / 0.2 : (1 - phase) / 0.8;
        // Formant resonance simulation
        const formant1 = Math.sin(2 * Math.PI * b.f1 * dt);
        const formant2 = Math.sin(2 * Math.PI * b.f2 * dt) * 0.5;
        s += (glottal * 0.35 + (formant1 + formant2) * 0.4) * env * 0.65;
      }
    });
    buf[i] = clamp(s);
  }
  return buf;
}

// 10. seven_chain: Short dramatic thunder & lightning (sharp crack + rolling rumble)
function generateSevenChain(): Float32Array {
  const duration = 1.25;
  const n = Math.floor(SAMPLE_RATE * duration);
  const raw = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;

    // Initial lightning crack (0 to 0.08s)
    let crack = 0;
    if (t < 0.08) {
      const crackEnv = Math.exp(-t * 70);
      crack = (Math.random() * 2 - 1) * crackEnv * 0.95;
    }

    // Heavy thunder boom and sub-bass rumble
    const rumbleDecay = Math.exp(-t * 2.8);
    const lowBoom = Math.sin(2 * Math.PI * (68 - t * 18) * t) * rumbleDecay * 0.7;
    // Rolling turbulent rumble noise
    const rollMod = 0.5 + 0.5 * Math.sin(2 * Math.PI * (5 + t * 4) * t);
    const rollNoise = (Math.random() * 2 - 1) * rumbleDecay * rollMod * 0.6;

    raw[i] = clamp(crack + lowBoom + rollNoise);
  }

  // Lowpass filter for deep thunder roll atmosphere
  return lowpass(raw, 450);
}

// 11. skip: Bus / Truck dual-tone air horn ("پام-پام!" / "بیپ-بیپ!")
function generateSkip(): Float32Array {
  const duration = 0.85;
  const n = Math.floor(SAMPLE_RATE * duration);
  const buf = new Float32Array(n);

  // Two distinct loud pneumatic bus horn blasts: "POM ... POM!"
  const blasts = [
    { start: 0.0, dur: 0.28 },
    { start: 0.38, dur: 0.42 },
  ];

  // Classic dual-tone commercial vehicle horn frequencies: F4 (349Hz) and A4 (440Hz)
  const freq1 = 349.23;
  const freq2 = 440.0;

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    blasts.forEach((b) => {
      if (t >= b.start && t < b.start + b.dur) {
        const dt = t - b.start;
        // attack-sustain-release envelope of air pressure
        let env = 1;
        if (dt < 0.03) env = dt / 0.03;
        else if (dt > b.dur - 0.04) env = (b.dur - dt) / 0.04;

        // Pneumatic air flutter
        const flutter = 1 + 0.08 * Math.sin(2 * Math.PI * 65 * dt);

        // Rich horn harmonics (square/sine mix)
        const tone1 = Math.sin(2 * Math.PI * freq1 * dt) + 0.3 * Math.sin(2 * Math.PI * freq1 * 2 * dt);
        const tone2 = Math.sin(2 * Math.PI * freq2 * dt) + 0.3 * Math.sin(2 * Math.PI * freq2 * 2 * dt);
        const airHiss = (Math.random() * 2 - 1) * 0.08;

        s += (tone1 * 0.4 + tone2 * 0.4 + airHiss) * env * flutter * 0.7;
      }
    });
    buf[i] = clamp(s);
  }
  return buf;
}

// 12. king_defense: Zipper zip + sharp tire brake skid/screech
function generateKingDefense(): Float32Array {
  const duration = 0.95;
  const n = Math.floor(SAMPLE_RATE * duration);
  const buf = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;

    // Phase 1: High speed zipper sound (0 to 0.28s)
    if (t < 0.28) {
      // Rapid tooth clicks accelerating
      const clickRate = 80 + t * 400;
      const phase = (t * clickRate) % 1;
      const clickEnv = Math.exp(-phase * 12);
      const zipNoise = (Math.random() * 2 - 1) * clickEnv * 0.6;
      const zipTone = Math.sin(2 * Math.PI * (1600 + t * 2400) * t) * 0.2;
      s = (zipNoise + zipTone) * Math.sin((t / 0.28) * Math.PI) * 0.8;
    }
    // Phase 2: Tire screech and brake skid (0.28 to 0.95s)
    else {
      const dt = t - 0.28;
      const skidDur = 0.67;
      let skidEnv = 1 - dt / skidDur;
      if (dt < 0.04) skidEnv *= dt / 0.04;

      // Skid FM screech (around 2600Hz sliding down to 1800Hz with friction rumble)
      const screechFreq = 2700 - dt * 1100 + Math.sin(2 * Math.PI * 45 * dt) * 150;
      const screech = Math.sin(2 * Math.PI * screechFreq * dt + Math.sin(2 * Math.PI * 180 * dt) * 1.5);
      const roadFriction = (Math.random() * 2 - 1) * 0.4;
      // Sudden final halt thump at end
      const haltThump = dt > 0.52 ? Math.sin(2 * Math.PI * 90 * (dt - 0.52)) * Math.exp(-(dt - 0.52) * 25) * 0.6 : 0;

      s = (screech * 0.5 + roadFriction * 0.3) * skidEnv * 0.75 + haltThump;
    }

    buf[i] = clamp(s);
  }
  return buf;
}

// 13. round_win: Triumphant ascending brass fanfare
function generateRoundWin(): Float32Array {
  const duration = 1.35;
  const n = Math.floor(SAMPLE_RATE * duration);
  const buf = new Float32Array(n);

  // Fanfare chord arpeggio: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz chord)
  const notes = [
    { start: 0.0, dur: 0.18, freq: 523.25 },
    { start: 0.16, dur: 0.18, freq: 659.25 },
    { start: 0.32, dur: 0.22, freq: 783.99 },
    { start: 0.50, dur: 0.85, freq: 1046.5 },
  ];

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    notes.forEach((note) => {
      if (t >= note.start && t < note.start + note.dur) {
        const dt = t - note.start;
        const decay = Math.exp(-dt * 3.2);
        // Brass timbre: fundamental + strong 2nd + 3rd harmonics
        const f1 = Math.sin(2 * Math.PI * note.freq * dt);
        const f2 = Math.sin(2 * Math.PI * note.freq * 2 * dt) * 0.45;
        const f3 = Math.sin(2 * Math.PI * note.freq * 3 * dt) * 0.25;
        s += (f1 + f2 + f3) * decay * 0.45;
      }
    });
    // Add extra harmony on the finale
    if (t >= 0.5) {
      const dt = t - 0.5;
      const decay = Math.exp(-dt * 3.0);
      const chord3rd = Math.sin(2 * Math.PI * 1318.5 * dt) * 0.25; // E6
      const chord5th = Math.sin(2 * Math.PI * 1567.98 * dt) * 0.2; // G6
      s += (chord3rd + chord5th) * decay;
    }
    buf[i] = clamp(s);
  }
  return buf;
}

// 14. game_win: Grand victory celebration fanfare + crowd cheering/hurrah ("هووورا")
function generateGameWin(): Float32Array {
  const duration = 2.4;
  const n = Math.floor(SAMPLE_RATE * duration);
  const buf = new Float32Array(n);

  // Grand Fanfare: G4 -> C5 -> E5 -> G5 -> C6!
  const fanfareNotes = [
    { start: 0.0, dur: 0.2, freq: 392.0 },
    { start: 0.18, dur: 0.2, freq: 523.25 },
    { start: 0.36, dur: 0.22, freq: 659.25 },
    { start: 0.56, dur: 0.3, freq: 783.99 },
    { start: 0.82, dur: 1.5, freq: 1046.5 },
  ];

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let music = 0;
    fanfareNotes.forEach((fn) => {
      if (t >= fn.start && t < fn.start + fn.dur) {
        const dt = t - fn.start;
        const decay = Math.exp(-dt * 2.2);
        const f1 = Math.sin(2 * Math.PI * fn.freq * dt);
        const f2 = Math.sin(2 * Math.PI * fn.freq * 2 * dt) * 0.4;
        const f3 = Math.sin(2 * Math.PI * fn.freq * 3 * dt) * 0.2;
        music += (f1 + f2 + f3) * decay * 0.4;
      }
    });

    if (t >= 0.82) {
      const dt = t - 0.82;
      const decay = Math.exp(-dt * 1.8);
      // major chord harmony
      const harm1 = Math.sin(2 * Math.PI * 1318.5 * dt) * 0.25;
      const harm2 = Math.sin(2 * Math.PI * 1567.98 * dt) * 0.2;
      music += (harm1 + harm2) * decay;
    }

    // Crowd applause and cheerful "Hooray / هووورا" cheering texture (0.6s to 2.4s)
    let cheer = 0;
    if (t >= 0.6) {
      const dt = t - 0.6;
      const cheerEnv = Math.sin((dt / 1.8) * Math.PI);
      // Vocal formant sweep for "Hoo-raaa!" (vocal resonance moving from ~400Hz to ~850Hz)
      const vocalFreq = 420 + Math.sin(dt * 3.5) * 220;
      const vocalTone = Math.sin(2 * Math.PI * vocalFreq * dt) * 0.25;
      // Applause clapping noise texture
      const claps = (Math.random() * 2 - 1) * (0.3 + 0.2 * Math.sin(2 * Math.PI * 12 * dt));
      cheer = (vocalTone + claps) * cheerEnv * 0.45;
    }

    buf[i] = clamp(music * 0.65 + cheer * 0.5);
  }
  return buf;
}

// Generate and save all 14 sound files
function main() {
  const soundsDir = path.resolve(process.cwd(), 'public', 'sounds');
  if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
  }

  const soundList = [
    { name: 'card_throw.wav', fn: generateCardThrow },
    { name: 'card_draw.wav', fn: generateCardDraw },
    { name: 'card_deal.wav', fn: generateCardDeal },
    { name: 'shuffle.wav', fn: generateShuffle },
    { name: 'your_turn.wav', fn: generateYourTurn },
    { name: 'error.wav', fn: generateError },
    { name: 'tak_declare.wav', fn: generateTakDeclare },
    { name: 'tak_caught.wav', fn: generateTakCaught },
    { name: 'joker.wav', fn: generateJoker },
    { name: 'seven_chain.wav', fn: generateSevenChain },
    { name: 'skip.wav', fn: generateSkip },
    { name: 'king_defense.wav', fn: generateKingDefense },
    { name: 'round_win.wav', fn: generateRoundWin },
    { name: 'game_win.wav', fn: generateGameWin },
  ];

  console.log(`Generating ${soundList.length} sound effect files in ${soundsDir}...`);
  for (const item of soundList) {
    const samples = item.fn();
    const buf = createWavBuffer(samples);
    const target = path.join(soundsDir, item.name);
    fs.writeFileSync(target, buf);
    console.log(`- Created ${item.name} (${buf.length} bytes)`);
  }
  console.log('All sounds successfully generated!');
}

main();
