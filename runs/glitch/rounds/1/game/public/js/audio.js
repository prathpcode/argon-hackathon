// Procedural WebAudio sound effects & ambient street music synthesizer
(function () {
  const AudioEngine = {
    ctx: null,
    sfxVolume: 0.65,
    musicVolume: 0.35,
    muted: false,
    musicMuted: false,
    currentTheme: null,
    musicTimer: null,
    thrillerActive: false,
    stepCooldown: 0,

    init() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch (e) {}
    },

    gain(vol = 1) {
      if (!this.ctx || this.muted) return null;
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      const g = this.ctx.createGain();
      g.gain.value = Math.max(0.0001, vol * this.sfxVolume);
      g.connect(this.ctx.destination);
      return g;
    },

    tone(freq, dur = 0.12, type = "sine", vol = 0.25, slideTo = null, delay = 0) {
      if (!this.ctx || this.muted) return;
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      const now = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
      }
      const peak = Math.max(0.0001, vol * this.sfxVolume);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(peak, now + Math.min(0.015, dur * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    },

    playStep() {
      const now = performance.now();
      if (now - this.stepCooldown < 210) return;
      this.stepCooldown = now;
      this.init();
      const pitch = 130 + Math.random() * 45;
      this.tone(pitch, 0.055, "triangle", 0.12, pitch * 0.7);
    },

    playJump() {
      this.init();
      this.tone(240, 0.16, "sine", 0.25, 520);
      this.tone(360, 0.12, "triangle", 0.15, 680, 0.04);
    },

    playLand() {
      this.init();
      this.tone(140, 0.07, "triangle", 0.18, 75);
    },

    playQuoin(qType) {
      this.init();
      const base = qType === "qurazy" ? 587.33 : qType === "currants" ? 523.25 : qType === "mood" ? 659.25 : 440;
      this.tone(base, 0.11, "sine", 0.28, base * 1.25, 0);
      this.tone(base * 1.25, 0.14, "sine", 0.28, base * 1.5, 0.06);
      this.tone(base * 1.5, 0.22, "triangle", 0.22, base * 2, 0.12);
    },

    playClick() {
      this.init();
      this.tone(520, 0.045, "sine", 0.16, 660);
    },

    playPop() {
      this.init();
      this.tone(380, 0.07, "sine", 0.22, 740);
    },

    playSqueeze() {
      this.init();
      this.tone(580, 0.09, "triangle", 0.25, 920, 0);
      this.tone(860, 0.12, "sine", 0.22, 480, 0.08);
    },

    playMine() {
      this.init();
      this.tone(880, 0.08, "square", 0.16, 420, 0);
      this.tone(1320, 0.12, "triangle", 0.2, 990, 0.02);
    },

    playDig() {
      this.init();
      this.tone(190, 0.11, "sawtooth", 0.16, 110, 0);
      this.tone(260, 0.09, "triangle", 0.18, 160, 0.05);
    },

    playWater() {
      this.init();
      for (let i = 0; i < 4; i++) {
        this.tone(420 + i * 95, 0.08, "sine", 0.16, 600 + i * 110, i * 0.05);
      }
    },

    playSuccess() {
      this.init();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, i) => this.tone(n, 0.18, "triangle", 0.26, null, i * 0.07));
    },

    playGiantFanfare() {
      this.init();
      const chord = [261.63, 329.63, 392.0, 523.25, 659.25];
      chord.forEach((n, i) => {
        this.tone(n, 0.65, "triangle", 0.22, n * 1.02, i * 0.06);
      });
    },

    playMusicblock(kind) {
      this.init();
      const seq = kind === "DG-2"
        ? [392, 440, 523.25, 659.25, 587.33, 523.25, 440, 392]
        : [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 261.63];
      seq.forEach((f, i) => {
        this.tone(f, 0.16, kind === "DG-2" ? "sawtooth" : "triangle", 0.2, f * 1.01, i * 0.14);
      });
    },

    setTheme(theme) {
      if (this.currentTheme === theme && this.musicTimer) return;
      this.currentTheme = theme;
      if (this.musicTimer) clearInterval(this.musicTimer);
      let step = 0;
      const scales = {
        savanna: [293.66, 329.63, 392.0, 440.0, 523.25, 587.33],
        spooky: [220.0, 246.94, 261.63, 329.63, 349.23, 440.0],
        snowy: [392.0, 440.0, 493.88, 587.33, 659.25, 783.99],
        cavern: [196.0, 220.0, 261.63, 293.66, 329.63, 392.0],
        office: [261.63, 329.63, 392.0, 493.88, 523.25, 440.0],
        thriller: [146.83, 164.81, 174.61, 196.0, 220.0, 196.0, 174.61, 164.81],
      };
      this.musicTimer = setInterval(() => {
        if (!this.ctx || this.muted || this.musicMuted || this.ctx.state !== "running") return;
        const activeTheme = this.thrillerActive ? "thriller" : (this.currentTheme || "savanna");
        const scale = scales[activeTheme] || scales.savanna;
        const note = scale[step % scale.length];
        step++;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = activeTheme === "thriller" ? "sawtooth" : activeTheme === "spooky" ? "sine" : "triangle";
        osc.frequency.setValueAtTime(note, now);
        const vol = (activeTheme === "thriller" ? 0.12 : 0.065) * this.musicVolume;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(Math.max(0.0001, vol), now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, now + (activeTheme === "thriller" ? 0.28 : 0.55));
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
      }, 450);
    },
  };

  window.AudioEngine = AudioEngine;
})();
