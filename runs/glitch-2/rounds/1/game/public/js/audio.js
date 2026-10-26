// Procedural WebAudio sound effects and ambient biome music for Ur's Whimsy
(function () {
  let ctx = null;
  let masterGain = null;
  let sfxGain = null;
  let musicGain = null;
  let muted = false;
  let currentTheme = "lost_woods";
  let overrideTheme = null;
  let overrideTimer = 0;
  let musicStep = 0;
  let musicInterval = null;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
        masterGain = ctx.createGain();
        sfxGain = ctx.createGain();
        musicGain = ctx.createGain();
        masterGain.gain.value = 0.7;
        sfxGain.gain.value = 0.65;
        musicGain.gain.value = 0.22;
        sfxGain.connect(masterGain);
        musicGain.connect(masterGain);
        masterGain.connect(ctx.destination);
      } catch (e) {
        return null;
      }
    }
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playTone(freq, type, dur, vol = 0.25, slideTo = null, delay = 0, dest = null) {
    const c = ensureCtx();
    if (!c || muted) return;
    try {
      const t0 = c.currentTime + delay;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(Math.max(20, freq), t0);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      }
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.02, dur * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(dest || sfxGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) {}
  }

  function playNoise(dur, vol = 0.15, filterFreq = 900, delay = 0) {
    const c = ensureCtx();
    if (!c || muted) return;
    try {
      const t0 = c.currentTime + delay;
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.5));
      const src = c.createBufferSource();
      src.buffer = buf;
      const filt = c.createBiquadFilter();
      filt.type = "bandpass";
      filt.frequency.value = filterFreq;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filt);
      filt.connect(g);
      g.connect(sfxGain);
      src.start(t0);
    } catch (e) {}
  }

  const SFX = {
    step() {
      playNoise(0.045, 0.07, 420 + Math.random() * 140);
    },
    jump() {
      playTone(240, "sine", 0.22, 0.2, 540);
      playTone(360, "triangle", 0.18, 0.12, 720, 0.04);
    },
    land() {
      playTone(130, "sine", 0.09, 0.14, 75);
      playNoise(0.05, 0.08, 300);
    },
    orb(kind) {
      const base = kind === "xp" ? 587.33 : kind === "currants" ? 659.25 : kind === "mood" ? 523.25 : 493.88;
      playTone(base, "sine", 0.16, 0.2, base * 1.25);
      playTone(base * 1.5, "triangle", 0.2, 0.15, base * 2, 0.06);
    },
    click() {
      playTone(520, "triangle", 0.06, 0.14, 680);
    },
    popup() {
      playTone(440, "sine", 0.08, 0.15, 587);
      playTone(660, "sine", 0.09, 0.12, 784, 0.04);
    },
    mineHit() {
      playTone(880 + Math.random() * 160, "triangle", 0.09, 0.2, 420);
      playTone(1320, "sine", 0.12, 0.14, 990, 0.01);
      playNoise(0.06, 0.12, 1800);
    },
    water() {
      playNoise(0.22, 0.14, 1100);
      playTone(392, "sine", 0.14, 0.12, 523, 0.05);
      playTone(523, "sine", 0.16, 0.12, 659, 0.12);
    },
    squeeze() {
      playTone(540, "sawtooth", 0.09, 0.12, 820);
      playTone(780, "triangle", 0.14, 0.14, 480, 0.08);
      playTone(620, "sine", 0.1, 0.12, 920, 0.16);
    },
    drink() {
      playTone(310, "sine", 0.1, 0.18, 440);
      playTone(380, "sine", 0.1, 0.18, 540, 0.11);
      playTone(587, "triangle", 0.18, 0.16, 784, 0.22);
    },
    pickup() {
      playTone(523.25, "triangle", 0.11, 0.18, 659.25);
      playTone(659.25, "triangle", 0.13, 0.18, 783.99, 0.07);
      playTone(1046.5, "sine", 0.22, 0.16, 1174.6, 0.14);
    },
    social() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, i) => playTone(n, "triangle", 0.18, 0.16, n * 1.03, i * 0.06));
    },
    giant() {
      playTone(196, "sawtooth", 0.8, 0.14, 196);
      playTone(293.66, "triangle", 0.85, 0.18, 293.66, 0.05);
      playTone(392, "sine", 0.9, 0.2, 440, 0.12);
      playTone(587.33, "sine", 0.95, 0.18, 587.33, 0.2);
    },
    quest() {
      const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      chord.forEach((n, i) => playTone(n, "triangle", 0.28, 0.18, n, i * 0.075));
    },
    dice() {
      for (let i = 0; i < 4; i++) {
        playNoise(0.04, 0.12, 1200 + i * 200, i * 0.055);
      }
      playTone(659, "triangle", 0.15, 0.16, 880, 0.24);
    },
    error() {
      playTone(220, "sawtooth", 0.14, 0.14, 165);
    },
  };

  // Biome scale patterns
  const SCALES = {
    lost_woods: [220, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25], // A minor pentatonic eerie plucked
    vam_road: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 659.25], // C major bright winter bells
    andra: [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25], // D major warm acoustic savannah
    kalavana: [196.0, 220.0, 261.63, 293.66, 349.23, 392.0], // G dorian cavern resonance
    interior: [261.63, 329.63, 392.0, 493.88, 523.25], // Calm office elevator/bossa lounge
    thriller: [164.81, 196.0, 220.0, 246.94, 293.66, 329.63], // Funky Pumpkin Ale groove
    musicblock: [392.0, 440.0, 493.88, 587.33, 659.25, 783.99, 880.0], // Musicbox celesta
  };

  function tickMusic() {
    if (!ctx || ctx.state !== "running" || muted) return;
    if (overrideTimer > 0) {
      overrideTimer -= 0.35;
      if (overrideTimer <= 0) overrideTheme = null;
    }
    const theme = overrideTheme || currentTheme || "lost_woods";
    const scale = SCALES[theme] || SCALES.lost_woods;
    musicStep = (musicStep + 1) % 16;

    if (theme === "thriller") {
      // Upbeat funky groove for Pumpkin Ale
      const bass = [164.81, 164.81, 196.0, 220.0, 164.81, 246.94, 220.0, 196.0];
      const f = bass[musicStep % bass.length];
      playTone(f, "sawtooth", 0.22, 0.16, f * 0.98, 0, musicGain);
      if (musicStep % 2 === 1) {
        playTone(scale[(musicStep * 3) % scale.length] * 2, "triangle", 0.14, 0.14, null, 0, musicGain);
      }
      return;
    }

    if (theme === "musicblock") {
      const idx = (musicStep * 2 + (musicStep % 3)) % scale.length;
      playTone(scale[idx], "sine", 0.45, 0.22, null, 0, musicGain);
      if (musicStep % 2 === 0) {
        playTone(scale[0] * 0.5, "triangle", 0.5, 0.12, null, 0, musicGain);
      }
      return;
    }

    // Regular ambient street music
    if (musicStep % 2 === 0) {
      const pat = [0, 2, 4, 3, 5, 4, 2, 1];
      const note = scale[pat[(musicStep / 2) % pat.length] % scale.length];
      const wave = theme === "vam_road" ? "sine" : theme === "andra" ? "triangle" : "sine";
      playTone(note, wave, 0.55, 0.18, note * 1.002, 0, musicGain);
      if (musicStep % 8 === 0) {
        playTone(scale[0] * 0.5, "triangle", 1.1, 0.14, null, 0, musicGain);
      }
    } else if (theme === "andra" && musicStep % 4 === 3) {
      const note = scale[4];
      playTone(note * 1.5, "triangle", 0.3, 0.11, null, 0, musicGain);
    }
  }

  function startLoop() {
    if (musicInterval) return;
    musicInterval = setInterval(tickMusic, 350);
  }

  window.AudioSys = {
    unlock() {
      ensureCtx();
      startLoop();
    },
    play(name, arg) {
      ensureCtx();
      startLoop();
      if (SFX[name]) SFX[name](arg);
    },
    setTheme(theme) {
      currentTheme = theme || "lost_woods";
    },
    triggerOverride(theme, seconds = 12) {
      overrideTheme = theme;
      overrideTimer = seconds;
    },
    toggleMute() {
      muted = !muted;
      if (masterGain && ctx) {
        masterGain.gain.setValueAtTime(muted ? 0 : 0.7, ctx.currentTime);
      }
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
})();
