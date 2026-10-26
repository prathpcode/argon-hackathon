// public/js/sound.js — Procedural WebAudio Synthesizer & Chiptune/Rock BGM Engine
(function () {
  let ctx = null;
  let muted = false;
  let bgmMode = "stage"; // "stage" | "boss" | "menu"
  let bgmTimer = null;
  let bgmStep = 0;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freq, type, dur, vol = 0.12, slideTo = null, delay = 0) {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    try {
      const now = c.currentTime + delay;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || "square";
      osc.frequency.setValueAtTime(Math.max(20, freq), now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
      }
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + dur + 0.01);
    } catch {}
  }

  function noise(dur, vol = 0.12, delay = 0) {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    try {
      const now = c.currentTime + delay;
      const bufSize = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, bufSize, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 950;
      const gain = c.createGain();
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start(now);
      src.stop(now + dur + 0.01);
    } catch {}
  }

  const SFX = {
    warp() {
      tone(220, "sawtooth", 0.22, 0.11, 880, 0);
      tone(440, "square", 0.18, 0.09, 1320, 0.08);
    },
    jump() {
      tone(240, "square", 0.14, 0.10, 620, 0);
    },
    shot(tier = 0) {
      if (tier === 0) {
        tone(680, "square", 0.09, 0.09, 240, 0);
      } else if (tier === 1) {
        tone(760, "sawtooth", 0.16, 0.12, 220, 0);
        tone(520, "square", 0.16, 0.08, 180, 0.02);
      } else if (tier === 2) {
        tone(920, "sawtooth", 0.22, 0.14, 190, 0);
        tone(640, "square", 0.22, 0.11, 150, 0.03);
        noise(0.12, 0.08, 0);
      } else {
        // Tier 3 Red/Pink Max Charge Blast
        tone(1180, "sawtooth", 0.30, 0.16, 140, 0);
        tone(880, "square", 0.28, 0.13, 220, 0.02);
        tone(520, "triangle", 0.32, 0.14, 110, 0.04);
        noise(0.18, 0.12, 0);
      }
    },
    chargeTick(tier) {
      const freqs = [330, 440, 587, 784];
      tone(freqs[tier] || 440, "sine", 0.07, 0.04, (freqs[tier] || 440) * 1.18, 0);
    },
    hit(combo = 1) {
      const base = 280 + Math.min(combo, 6) * 90;
      tone(base, "square", 0.11, 0.12, base * 0.45, 0);
      noise(0.09, 0.10, 0);
    },
    gigaCrush() {
      for (let i = 0; i < 6; i++) {
        tone(980 - i * 60, "sawtooth", 0.25, 0.14, 140, i * 0.07);
        noise(0.18, 0.13, i * 0.07);
      }
    },
    coin() {
      tone(987.77, "square", 0.06, 0.08, null, 0);
      tone(1318.5, "square", 0.12, 0.09, null, 0.05);
    },
    cardDrop() {
      tone(523.25, "triangle", 0.09, 0.11, null, 0);
      tone(659.25, "triangle", 0.09, 0.11, null, 0.07);
      tone(783.99, "triangle", 0.12, 0.12, null, 0.14);
      tone(1046.5, "square", 0.20, 0.12, null, 0.21);
    },
    skillCutIn() {
      tone(440, "sawtooth", 0.08, 0.10, 880, 0);
      tone(660, "square", 0.15, 0.11, 1320, 0.06);
    },
    warning() {
      tone(440, "sawtooth", 0.22, 0.14, 392, 0);
      tone(440, "sawtooth", 0.22, 0.14, 392, 0.28);
    },
    victory() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
      const durs = [0.1, 0.1, 0.1, 0.18, 0.1, 0.32];
      let t = 0;
      for (let i = 0; i < notes.length; i++) {
        tone(notes[i], "square", durs[i], 0.11, null, t);
        t += durs[i] + 0.02;
      }
    },
    levelUp() {
      const notes = [440, 554.37, 659.25, 880, 1108.73];
      notes.forEach((n, i) => tone(n, "square", 0.12, 0.11, null, i * 0.07));
    },
    cheer() {
      tone(587.33, "triangle", 0.09, 0.10, 880, 0);
      tone(880, "square", 0.16, 0.10, 1174.66, 0.08);
    },
    click() {
      tone(720, "square", 0.04, 0.06, 480, 0);
    },
  };

  // Light rock/chiptune driving bass & lead loop
  const STAGE_NOTES = [
    220, 220, 261.63, 293.66, 329.63, 329.63, 293.66, 261.63,
    196, 196, 246.94, 293.66, 329.63, 392.00, 329.63, 293.66,
  ];
  const BOSS_NOTES = [
    164.81, 164.81, 196.00, 220.00, 233.08, 220.00, 196.00, 164.81,
    146.83, 146.83, 174.61, 196.00, 220.00, 196.00, 174.61, 164.81,
  ];

  function startBGM() {
    if (bgmTimer) return;
    bgmTimer = setInterval(() => {
      if (muted || !ctx || ctx.state !== "running") return;
      const seq = bgmMode === "boss" ? BOSS_NOTES : STAGE_NOTES;
      const f = seq[bgmStep % seq.length];
      tone(f * 0.5, "triangle", 0.14, 0.035);
      if (bgmStep % 2 === 0) {
        tone(f, "square", 0.11, 0.025);
      }
      bgmStep++;
    }, 170);
  }

  window.Sound = {
    SFX,
    ensureCtx,
    startBGM,
    setMode(m) {
      bgmMode = m;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
})();
