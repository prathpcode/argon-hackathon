// Synthesized WebAudio sound effects & light ambient loop for GEMBLOX.IO
(function () {
  let ctx = null;
  let muted = false;
  let ambientTimer = null;

  function ensureCtx() {
    if (muted) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        try { ctx = new AC(); } catch (e) { return null; }
      }
    }
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playPickup(combo = 0) {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    const baseFreq = 520 + Math.min(combo * 28, 420);
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, now + 0.065);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  function playMerge(size = 2) {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const count = Math.min(4, Math.max(2, size));
    for (let i = 0; i < count; i++) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "triangle";
      const freq = notes[i % notes.length] * (1 + Math.max(0, size - 3) * 0.08);
      const t0 = now + i * 0.035;
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.06, t0 + 0.16);
      gain.gain.setValueAtTime(0.11, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + 0.19);
    }
  }

  function playEject() {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "quad" in osc ? "square" : "triangle";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  function playShatter(big = false) {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const count = big ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = i % 2 === 0 ? "sawtooth" : "triangle";
      const f = (big ? 280 : 380) + i * 95;
      const t0 = now + i * 0.02;
      osc.frequency.setValueAtTime(f, t0);
      osc.frequency.exponentialRampToValueAtTime(90 + i * 20, t0 + 0.15);
      gain.gain.setValueAtTime(big ? 0.1 : 0.065, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + 0.17);
    }
  }

  function playSpinTick() {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.05);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  function playDeath() {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime;
    const freqs = [392, 349.23, 311.13, 261.63];
    freqs.forEach((f, idx) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sawtooth";
      const t0 = now + idx * 0.07;
      osc.frequency.setValueAtTime(f, t0);
      osc.frequency.exponentialRampToValueAtTime(f * 0.85, t0 + 0.14);
      gain.gain.setValueAtTime(0.08, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + 0.16);
    });
  }

  function startAmbient() {
    if (ambientTimer) return;
    const chords = [
      [261.63, 329.63, 392.0],
      [293.66, 369.99, 440.0],
      [246.94, 311.13, 369.99],
      [220.0, 277.18, 329.63]
    ];
    let step = 0;
    ambientTimer = setInterval(() => {
      if (muted || !ctx || ctx.state !== "running") return;
      const now = ctx.currentTime;
      const chord = chords[step % chords.length];
      step++;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(chord[step % chord.length], now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.012, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.85);
    }, 2200);
  }

  window.AudioFX = {
    unlock() {
      ensureCtx();
      startAmbient();
    },
    playPickup,
    playMerge,
    playEject,
    playShatter,
    playSpinTick,
    playDeath,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    }
  };
})();
