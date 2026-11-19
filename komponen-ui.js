/* ==========================================================================
   komponen-ui.js — TABLET LOG PRAKTIKUM 3D DI TANGAN PEMAIN
   ========================================================================== */

AFRAME.registerComponent('tablet-praktikum', {
  init() {
    // Bingkai tablet 3D
    buatEl('a-box', { width: 0.44, height: 0.56, depth: 0.022, color: '#0f172a' }, this.el);
    buatEl('a-plane', { width: 0.40, height: 0.52, position: '0 0 0.013', material: 'shader: flat; color: #0b1324' }, this.el);
    buatEl('a-plane', { width: 0.40, height: 0.012, position: '0 0.254 0.014', material: 'shader: flat; color: #38bdf8' }, this.el);

    // Judul Tablet
    buatEl('a-text', {
      value: 'LOG PRAKTIKUM VR',
      align: 'center',
      color: '#38bdf8',
      width: 0.42,
      'wrap-count': 22,
      position: '0 0.2 0.016'
    }, this.el);

    // Garis pemisah
    buatEl('a-plane', { width: 0.36, height: 0.003, position: '0 0.168 0.015', material: 'shader: flat; color: #1e293b' }, this.el);

    // 1. Bagian Status Kristal
    buatEl('a-text', {
      value: 'STATUS KRISTAL MISI',
      align: 'left',
      anchor: 'left',
      color: '#facc15',
      width: 0.36,
      'wrap-count': 28,
      position: '-0.175 0.142 0.016'
    }, this.el);

    this.teksKristal = buatEl('a-text', {
      value: '',
      align: 'left',
      anchor: 'left',
      baseline: 'top',
      color: '#e2e8f0',
      width: 0.35,
      'wrap-count': 32,
      position: '-0.175 0.122 0.016'
    }, this.el);

    // 2. Bagian Galeri Materi (7 Gerbang)
    buatEl('a-text', {
      value: 'MATERI GERBANG LOGIKA',
      align: 'left',
      anchor: 'left',
      color: '#38bdf8',
      width: 0.36,
      'wrap-count': 28,
      position: '-0.175 0.002 0.016'
    }, this.el);

    this.teksMateri = buatEl('a-text', {
      value: '',
      align: 'left',
      anchor: 'left',
      baseline: 'top',
      color: '#cbd5e1',
      width: 0.35,
      'wrap-count': 32,
      position: '-0.175 -0.018 0.016'
    }, this.el);

    // 3. Bagian Lab Saklar & Arena Uji
    buatEl('a-text', {
      value: 'SIMULATOR & ARENA UJI',
      align: 'left',
      anchor: 'left',
      color: '#2ecc71',
      width: 0.36,
      'wrap-count': 28,
      position: '-0.175 -0.118 0.016'
    }, this.el);

    this.teksEvaluasi = buatEl('a-text', {
      value: '',
      align: 'left',
      anchor: 'left',
      baseline: 'top',
      color: '#e2e8f0',
      width: 0.35,
      'wrap-count': 32,
      position: '-0.175 -0.138 0.016'
    }, this.el);

    // Petunjuk tutup di bagian bawah
    buatEl('a-text', {
      value: 'Tekan [T] untuk menutup log',
      align: 'center',
      color: '#64748b',
      width: 0.34,
      'wrap-count': 34,
      position: '0 -0.235 0.016'
    }, this.el);

    this.segarkan();
  },

  segarkan() {
    if (!this.teksKristal) return;

    // 1. Ringkasan 3 Kristal
    const barisKristal = MISI.map((m, idx) => {
      const ok = !!PROG[m.k];
      return `${ok ? '[OK]' : '[  ]'} ${idx + 1}. Kristal ${m.nama} (${ok ? 'Diraih' : 'Belum'})`;
    }).join('\n');
    this.teksKristal.setAttribute('value', barisKristal);

    // 2. Daftar 7 Gerbang (dibagi 2 baris agar rapi di dalam tablet)
    const sudahMat = new Set(PROG.mat || []);
    const baris1 = JENIS_GERBANG.slice(0, 4).map((g, i) => `${sudahMat.has(i) ? '[v]' : '[ ]'} ${g}`).join('  ');
    const baris2 = JENIS_GERBANG.slice(4).map((g, i) => `${sudahMat.has(i + 4) ? '[v]' : '[ ]'} ${g}`).join('  ');
    this.teksMateri.setAttribute('value', `Tercatat: ${sudahMat.size}/7 gerbang\n${baris1}\n${baris2}`);

    // 3. Progres Simulator & Kuis
    const coba = PROG.sim || {};
    const jmlSim = JENIS_GERBANG.filter((j) => (coba[j] || []).length >= (j === 'NOT' ? 2 : 4)).length;
    const teksKuis = PROG.skorKuis != null ? `${PROG.skorKuis}/8 (${PROG.kuis ? 'Lulus' : 'Ulangi'})` : 'Belum dikerjakan';
    this.teksEvaluasi.setAttribute('value', `- Tabel Kebenaran: ${Math.min(jmlSim, 4)}/4 gerbang\n- Skor Arena Uji: ${teksKuis}`);
  }
});

AFRAME.registerComponent('kamera-orbit-menu', {
  schema: {
    kecepatan: { type: 'number', default: 5.5 } // derajat per detik
  },

  init() {
    this.sudut = 25;
  },

  tick(t, dt) {
    if (typeof UI === 'undefined' || UI.layar !== 'menu' || !dt) return;

    const pemain = document.getElementById('pemain');
    const kamera = document.getElementById('kamera');
    if (!pemain || !kamera) return;

    // Putar kamera mengelilingi titik tengah ruangan (0, 1.65, -0.5) secara infinite
    this.sudut = (this.sudut + this.data.kecepatan * (dt / 1000)) % 360;
    const rad = THREE.MathUtils.degToRad(this.sudut);
    const radius = 2.6;

    pemain.object3D.position.set(
      Math.sin(rad) * radius,
      1.65,
      -0.5 + Math.cos(rad) * radius
    );
    pemain.object3D.rotation.set(0, rad, 0);

    // Kunci sudut pandang sedikit menunduk (-4 derajat) agar ruangan pameran terlihat jelas
    if (kamera.components['look-controls']) {
      kamera.components['look-controls'].yawObject.rotation.y = 0;
      kamera.components['look-controls'].pitchObject.rotation.x = THREE.MathUtils.degToRad(-4);
    }
  }
});