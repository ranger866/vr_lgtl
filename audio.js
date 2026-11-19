/* ==========================================================================
   audio.js — SINTESIS EFEK SUARA, BGM AMBIENT LAB & NARASI SUARA INDONESIA
   ========================================================================== */

const Suara = {
  ctx: null,
  aktif: true,
  bgmAktif: false,
  bgmMaster: null,
  bgmTimer: null,
  bgmOsilators: [],
  langkahMelodi: 0,

  siapkan() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.aktif && !this.bgmAktif) {
      this.mulaiBGM();
    }
  },

  mulaiBGM() {
    if (!this.aktif || this.bgmAktif || !this.ctx) return;
    this.bgmAktif = true;

    const t0 = this.ctx.currentTime;

    // Master gain untuk BGM agar lembut & bisa di-duck saat narasi bicara
    this.bgmMaster = this.ctx.createGain();
    this.bgmMaster.gain.setValueAtTime(0.0001, t0);
    this.bgmMaster.gain.exponentialRampToValueAtTime(0.045, t0 + 2.5);

    // Filter low-pass hangat agar suara tidak menusuk telinga
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, t0);
    filter.Q.setValueAtTime(1.2, t0);

    // LFO lambat untuk mengayunkan filter seperti napas ruangan lab
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.09, t0);
    lfoGain.gain.setValueAtTime(160, t0);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(t0);

    filter.connect(this.bgmMaster);
    this.bgmMaster.connect(this.ctx.destination);

    // 3 osilator pad atmosfer lembut (C3, G3, E4)
    const nadaPad = [
      { frek: 130.81, tipe: 'sine', vol: 0.45 },
      { frek: 196.00, tipe: 'triangle', vol: 0.22 },
      { frek: 329.63, tipe: 'sine', vol: 0.16 }
    ];

    this.bgmOsilators = [lfo];
    nadaPad.forEach((n) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = n.tipe;
      osc.frequency.setValueAtTime(n.frek, t0);
      g.gain.setValueAtTime(n.vol, t0);
      osc.connect(g);
      g.connect(filter);
      osc.start(t0);
      this.bgmOsilators.push(osc);
    });

    // Denting melodi digital pelan berkala (pentatonik C mayor)
    const tanggaNada = [523.25, 659.25, 783.99, 987.77, 783.99, 659.25, 587.33, 493.88];
    this.bgmTimer = setInterval(() => {
      if (!this.aktif || !this.bgmAktif || !this.ctx || !this.bgmMaster) return;
      if (this.ctx.state === 'suspended') return;

      const frek = tanggaNada[this.langkahMelodi % tanggaNada.length];
      this.langkahMelodi++;

      const sekarang = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frek, sekarang);

      g.gain.setValueAtTime(0.0001, sekarang);
      g.gain.exponentialRampToValueAtTime(0.14, sekarang + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, sekarang + 2.2);

      osc.connect(g);
      g.connect(this.bgmMaster);
      osc.start(sekarang);
      osc.stop(sekarang + 2.25);
    }, 3200);
  },

  hentikanBGM() {
    this.bgmAktif = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.bgmOsilators.forEach((osc) => {
      try { osc.stop(); } catch (e) {}
    });
    this.bgmOsilators = [];
    this.bgmMaster = null;
  },

  aturVolumeBGM(meredup) {
    if (!this.ctx || !this.bgmMaster || !this.bgmAktif) return;
    const target = meredup ? 0.012 : 0.045;
    this.bgmMaster.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
  },

  nada(frek, durasi = 0.08, tipe = 'sine', vol = 0.07, tunda = 0) {
    if (!this.aktif) return;
    this.siapkan();
    if (!this.ctx) return;

    const t0 = this.ctx.currentTime + tunda;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = tipe;
    osc.frequency.setValueAtTime(frek, t0);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durasi);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + durasi + 0.01);
  },

  hover() {
    if (!this.aktif || !this.ctx || this.ctx.state !== 'running') return;
    this.nada(840, 0.032, 'sine', 0.028);
  },

  klik() {
    this.nada(560, 0.055, 'triangle', 0.06);
  },

  saklar(on) {
    this.nada(on ? 720 : 340, 0.07, 'square', 0.045);
  },

  pintu() {
    this.nada(240, 0.25, 'sine', 0.05, 0);
    this.nada(360, 0.3, 'sine', 0.05, 0.14);
  },

  progresPad(langkah) {
    this.nada(420 + langkah * 95, 0.075, 'sine', 0.055);
  },

  benar() {
    [523.25, 659.25, 783.99].forEach((f, i) => this.nada(f, 0.14, 'triangle', 0.07, i * 0.08));
  },

  salah() {
    this.nada(190, 0.18, 'sawtooth', 0.055, 0);
    this.nada(145, 0.24, 'sawtooth', 0.055, 0.13);
  },

  kristal() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.nada(f, 0.22, 'sine', 0.08, i * 0.1));
  }
};

const Narasi = {
  bicara(teks) {
    if (!Suara.aktif || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    Suara.aturVolumeBGM(true); // Kecilkan BGM saat narasi membacakan materi
    const u = new SpeechSynthesisUtterance(teks);
    u.lang = 'id-ID';
    u.rate = 0.98;
    u.onend = () => Suara.aturVolumeBGM(false);
    u.onerror = () => Suara.aturVolumeBGM(false);
    window.speechSynthesis.speak(u);
  },
  diam() {
    Suara.aturVolumeBGM(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
};