/* ==========================================================================
   ruang.js — PEMBANGUN 4 RUANG 3D & OBJEK INTERAKTIF GERBANG LOGIKA
   ========================================================================== */

const KABEL_ON = '#2ecc71';
const KABEL_OFF = '#1e3a2f';

function buatEl(tag, attrs = {}, induk) {
  const e = document.createElement(tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (induk) induk.appendChild(e);
  return e;
}

/* ==========================================================================
   PUSTAKA GERBANG 3D
   ========================================================================== */
function tabung(induk, a, b, r = 0.055, warna = '#38bdf8') {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return buatEl('a-cylinder', {
    radius: r,
    height: Math.hypot(dx, dy),
    'segments-radial': 10,
    position: `${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2} 0`,
    rotation: `0 0 ${(Math.atan2(dy, dx) * 180) / Math.PI - 90}`,
    material: `color: ${warna}; emissive: ${warna}; emissiveIntensity: 0.4`
  }, induk);
}

function busur(induk, cx, cy, r, mulai, arc, warna = '#38bdf8') {
  return buatEl('a-torus', {
    radius: r,
    'radius-tubular': 0.055,
    arc,
    'segments-radial': 8,
    'segments-tubular': 28,
    position: `${cx} ${cy} 0`,
    rotation: `0 0 ${mulai}`,
    material: `color: ${warna}; emissive: ${warna}; emissiveIntensity: 0.4`
  }, induk);
}

function kabelLogisim(induk, x1, x2, y) {
  const k = buatEl('a-cylinder', {
    radius: 0.048,
    height: x2 - x1,
    'segments-radial': 8,
    position: `${(x1 + x2) / 2} ${y} 0`,
    rotation: '0 0 90',
    material: `color: ${KABEL_OFF}`
  }, induk);

  const pulsa = buatEl('a-sphere', {
    radius: 0.09,
    visible: false,
    position: `${x1} ${y} 0`,
    material: `color: ${KABEL_ON}; emissive: ${KABEL_ON}; emissiveIntensity: 1`,
    animation: `property: position; from: ${x1} ${y} 0; to: ${x2} ${y} 0; dur: 850; loop: true; easing: linear`
  }, induk);

  return {
    set(val) {
      k.setAttribute('material', {
        color: val ? KABEL_ON : KABEL_OFF,
        emissive: val ? KABEL_ON : '#000000',
        emissiveIntensity: val ? 0.75 : 0
      });
      pulsa.setAttribute('visible', !!val);
    }
  };
}

function bangunGerbang(induk, jenis, { pos = '0 0 0', skala = 1, kabelOn = true, awal = -1.7 } = {}) {
  const g = buatEl('a-entity', { position: pos, scale: `${skala} ${skala} ${skala}` }, induk);
  const info = DATA_GERBANG[jenis];
  const w = info.warna;
  const inv = ['NOT', 'NAND', 'NOR', 'XNOR'].includes(jenis);
  const dua = jenis !== 'NOT';
  const dasar = { NOT: 'N', AND: 'A', NAND: 'A', OR: 'O', NOR: 'O', XOR: 'O', XNOR: 'O' }[jenis];

  let ujung = 0.7;
  let masuk = -0.5;

  if (dasar === 'A') {
    tabung(g, [-0.5, 0.5], [-0.5, -0.5], 0.055, w);
    tabung(g, [-0.5, 0.5], [0.2, 0.5], 0.055, w);
    tabung(g, [-0.5, -0.5], [0.2, -0.5], 0.055, w);
    busur(g, 0.2, 0, 0.5, -90, 180, w);
  } else if (dasar === 'O') {
    busur(g, -0.5, -1.19, 1.69, 44.7, 45.3, w);
    busur(g, -0.5, 1.19, 1.69, -90, 45.3, w);
    busur(g, -1.025, 0, 0.725, -43.6, 87.2, w);
    if (jenis[0] === 'X') busur(g, -1.225, 0, 0.725, -43.6, 87.2, w);
    masuk = -0.34;
  } else {
    tabung(g, [-0.4, 0.5], [-0.4, -0.5], 0.055, w);
    tabung(g, [-0.4, 0.5], [0.5, 0], 0.055, w);
    tabung(g, [-0.4, -0.5], [0.5, 0], 0.055, w);
    ujung = 0.5;
    masuk = -0.4;
  }

  if (inv) {
    busur(g, ujung + 0.08, 0, 0.08, 0, 360, w);
    ujung += 0.16;
  }

  const kabel = {};
  let led = null;
  if (kabelOn) {
    kabel.a = kabelLogisim(g, awal, masuk, dua ? 0.25 : 0);
    if (dua) kabel.b = kabelLogisim(g, awal, masuk, -0.25);
    kabel.y = kabelLogisim(g, ujung, 2.0, 0);

    led = buatEl('a-sphere', {
      radius: 0.26,
      'segments-width': 18,
      'segments-height': 14,
      position: '2.28 0 0',
      material: `color: ${KABEL_OFF}`
    }, g);
  }

  return {
    g,
    set(a, b = 0) {
      const y = info.fn(a, b);
      if (kabel.a) kabel.a.set(a);
      if (kabel.b) kabel.b.set(b);
      if (kabel.y) kabel.y.set(y);
      if (led) {
        led.setAttribute('material', {
          color: y ? KABEL_ON : KABEL_OFF,
          emissive: y ? KABEL_ON : '#000000',
          emissiveIntensity: y ? 0.95 : 0
        });
      }
      return y;
    },
    hapus() {
      if (g.parentNode) g.parentNode.removeChild(g);
    }
  };
}

/* Papan Tabel Kebenaran 3D */
function buatPapanTabel(induk, pos, tema) {
  const t = buatEl('a-entity', { position: pos }, induk);
  buatEl('a-box', { width: 2.3, height: 2.4, depth: 0.06, color: tema.papan }, t);
  buatEl('a-box', { width: 2.3, height: 0.05, depth: 0.07, position: '0 1.2 0', material: 'shader: flat; color: #38bdf8' }, t);

  const sel = (teks, x, y, warna = '#ffffff') => buatEl('a-text', {
    value: String(teks),
    align: 'center',
    color: warna,
    width: 1.4,
    'wrap-count': 5,
    position: `${x} ${y} 0.04`
  }, t);

  ['A', 'B', 'Y'].forEach((h, i) => sel(h, -0.65 + i * 0.65, 0.78, '#facc15'));
  let barisEl = [];

  return {
    isi(jenis) {
      barisEl.forEach((r) => r.forEach((e) => t.removeChild(e)));
      const dua = jenis !== 'NOT';
      const kombinasi = dua ? [[0, 0], [0, 1], [1, 0], [1, 1]] : [[0], [1]];
      barisEl = kombinasi.map((r, idx) => {
        const nilai = [r[0], dua ? r[1] : '-', DATA_GERBANG[jenis].fn(...r)];
        return nilai.map((v, i) => sel(v, -0.65 + i * 0.65, 0.34 - idx * 0.4, '#e2e8f0'));
      });
      return kombinasi;
    },
    sorot(barisIdx, warna = KABEL_ON) {
      if (!barisEl[barisIdx]) return;
      barisEl[barisIdx].forEach((e) => e.setAttribute('color', warna));
    },
    reset() {
      barisEl.forEach((r) => r.forEach((e) => e.setAttribute('color', '#e2e8f0')));
    }
  };
}

/* Plakat 3D */
function buatPlakat(induk, teks, pos, w = 3.2, h = 0.55, tema, { warnaTeks = '#ffffff', wrap = 26, aksen = '#38bdf8', hadap = true } = {}) {
  const g = buatEl('a-entity', Object.assign({ position: pos }, hadap ? { 'hadap-pemain': '' } : {}), induk);
  buatEl('a-box', { width: w, height: h, depth: 0.05, color: tema.papan }, g);
  buatEl('a-box', { width: w, height: 0.04, depth: 0.06, position: `0 ${-h / 2} 0`, material: `shader: flat; color: ${aksen}` }, g);
  return buatEl('a-text', {
    value: teks,
    align: 'center',
    color: warnaTeks,
    width: w - 0.35,
    'wrap-count': wrap,
    position: '0 0.02 0.04'
  }, g);
}

/* Pintu Portal Antar Ruang */
function buatPintu(induk, tema, idRuangPemilik, { pos, rot = 0, tujuan, warna, judul, sub, kunci = () => false, pesan = '' }) {
  const g = buatEl('a-entity', { position: pos, rotation: `0 ${rot} 0` }, induk);
  const papan = buatEl('a-entity', { position: '0 0 0.45' }, g);

  [-0.9, 0.9].forEach((dx) => {
    buatEl('a-cylinder', { radius: 0.015, height: 0.45, position: `${dx} 4.25 0`, color: '#475569' }, papan);
  });
  buatEl('a-box', { width: 2.5, height: 0.85, depth: 0.08, position: '0 3.7 0', color: tema.papan }, papan);
  const garis = buatEl('a-box', { width: 2.5, height: 0.08, depth: 0.1, position: '0 3.3 0', color: warna }, papan);

  buatEl('a-text', { value: judul, align: 'center', color: '#ffffff', width: 2.2, 'wrap-count': 14, position: '0 3.8 0.05' }, papan);
  const teksSub = buatEl('a-text', { value: sub, align: 'center', color: '#cbd5e1', width: 2.1, 'wrap-count': 24, position: '0 3.5 0.05' }, papan);

  const bingkai = buatEl('a-box', { width: 2.1, height: 3.0, depth: 0.06, material: `shader: flat; color: ${warna}`, position: '0 1.5 -0.03' }, g);
  const portal = buatEl('a-plane', { width: 1.7, height: 2.7, position: '0 1.4 0.01', material: `shader: flat; color: ${warna}; opacity: 0.85` }, g);

  const engsel = buatEl('a-entity', {
    position: '-0.85 0 0.06',
    animation__buka: 'property: rotation; to: 0 -95 0; dur: 700; easing: easeInOutQuad; startEvents: buka',
    animation__tutup: 'property: rotation; to: 0 0 0; dur: 400; startEvents: tutup'
  }, g);

  const daun = buatEl('a-box', {
    class: 'klik',
    width: 1.7,
    height: 2.7,
    depth: 0.08,
    position: '0.85 1.4 0',
    color: '#1e293b'
  }, engsel);
  buatEl('a-sphere', { radius: 0.07, color: '#facc15', position: '0.65 -0.1 0.06' }, daun);

  const segar = () => {
    const terkunci = kunci();
    teksSub.setAttribute('value', terkunci ? 'TERKUNCI' : sub);
    teksSub.setAttribute('color', terkunci ? '#f87171' : '#cbd5e1');
    garis.setAttribute('color', terkunci ? '#ef4444' : warna);
    bingkai.setAttribute('material', { color: terkunci ? '#475569' : warna });
    portal.setAttribute('material', { color: terkunci ? '#334155' : warna });
  };
  segar();
  daftarSegarPintu.push(segar);

  daun.addEventListener('mouseenter', () => {
    if (ruangAktif !== idRuangPemilik) return;
    tampilAksi(kunci() ? `Terkunci — ${pesan}` : `Klik untuk masuk ke ${judul}`);
    if (!kunci()) daun.setAttribute('material', { emissive: warna, emissiveIntensity: 0.45 });
  });
  daun.addEventListener('mouseleave', () => {
    tampilAksi(null);
    daun.setAttribute('material', { emissiveIntensity: 0 });
  });

  let sibuk = false;
  daun.addEventListener('click', () => {
    if (sibuk || ruangAktif !== idRuangPemilik) return;
    if (kunci()) {
      Suara.salah();
      notif(pesan);
      return;
    }
    sibuk = true;
    engsel.emit('buka');
    setTimeout(() => {
      pindahRuang(tujuan);
      setTimeout(() => {
        engsel.emit('tutup');
        sibuk = false;
      }, 500);
    }, 650);
  });
}

function bangunKotakRuang(wadah, tema, { lebar, dalam, tinggi }, aksen) {
  const w = lebar / 2;
  const d = dalam / 2;
  buatEl('a-plane', { rotation: '-90 0 0', width: lebar, height: dalam, color: tema.lantai }, wadah);
  buatEl('a-plane', { rotation: '90 0 0', width: lebar, height: dalam, position: `0 ${tinggi} 0`, color: tema.plafon }, wadah);
  buatEl('a-box', { width: lebar + 0.6, height: tinggi, depth: 0.3, position: `0 ${tinggi / 2} ${-d - 0.15}`, color: tema.dindingBelakang }, wadah);
  buatEl('a-box', { width: lebar + 0.6, height: tinggi, depth: 0.3, position: `0 ${tinggi / 2} ${d + 0.15}`, color: tema.dinding }, wadah);
  buatEl('a-box', { width: 0.3, height: tinggi, depth: dalam, position: `${-w - 0.15} ${tinggi / 2} 0`, color: tema.dinding }, wadah);
  buatEl('a-box', { width: 0.3, height: tinggi, depth: dalam, position: `${w + 0.15} ${tinggi / 2} 0`, color: tema.dinding }, wadah);

  for (let x = -w + 2; x < w; x += 2) {
    buatEl('a-box', { width: 0.03, height: 0.008, depth: dalam, position: `${x} 0.004 0`, color: tema.garis, opacity: 0.35 }, wadah);
  }
  for (let z = -d + 2; z < d; z += 2) {
    buatEl('a-box', { width: lebar, height: 0.008, depth: 0.03, position: `0 0.004 ${z}`, color: tema.garis, opacity: 0.35 }, wadah);
  }

  [-d + 0.06, d - 0.06].forEach((z) => {
    buatEl('a-box', { width: lebar, height: 0.16, depth: 0.08, position: `0 0.08 ${z}`, material: `shader: flat; color: ${aksen}` }, wadah);
  });
  [-w + 0.06, w - 0.06].forEach((x) => {
    buatEl('a-box', { width: 0.08, height: 0.16, depth: dalam, position: `${x} 0.08 0`, material: `shader: flat; color: ${aksen}` }, wadah);
  });
}

function bangunJudulDinding(wadah, tema, dalam, tinggi, judul, sub, warna) {
  const p = buatEl('a-entity', { position: `0 ${tinggi - 0.85} ${-dalam / 2 + 0.08}` }, wadah);
  buatEl('a-box', { width: 9.2, height: 1.55, depth: 0.08, color: tema.papan }, p);
  buatEl('a-box', { width: 9.2, height: 0.08, depth: 0.1, position: '0 -0.8 0', material: `shader: flat; color: ${warna}` }, p);
  buatEl('a-text', { value: judul, align: 'center', color: '#ffffff', width: 8.4, 'wrap-count': 28, position: '0 0.28 0.05' }, p);
  buatEl('a-text', { value: sub, align: 'center', color: '#cbd5e1', width: 8.2, 'wrap-count': 52, position: '0 -0.28 0.05' }, p);
}

/* ==========================================================================
   KOMPONEN UTAMA <a-scene lab-logika>
   ========================================================================== */
AFRAME.registerComponent('lab-logika', {
  init() {
    const tema = TEMA_LAB[Pengaturan.data.tema] || TEMA_LAB.gelap;
    UI.siapkan();
    Pengaturan.terapkan();

    this.bangunLobi(tema);
    this.bangunMateri(tema);
    this.bangunSimulator(tema);
    this.bangunKuis(tema);

    const mulai = () => {
      tampilkanRuang('materi');
      const tirai = document.getElementById('tirai-layar');
      if (tirai) tirai.classList.remove('aktif');
    };

    if (this.el.hasLoaded) mulai();
    else this.el.addEventListener('loaded', mulai);
  },

  /* 1. LOBI UTAMA */
  bangunLobi(tema) {
    const wadah = document.getElementById('ruang-lobi');
    const T = 4.6;
    buatEl('a-plane', { rotation: '-90 0 0', width: 16, height: 14, position: '0 0 1', color: tema.lantai }, wadah);
    buatEl('a-plane', { rotation: '90 0 0', width: 16, height: 14, position: `0 ${T} 1`, color: tema.plafon }, wadah);
    buatEl('a-box', { width: 16.6, height: T, depth: 0.3, position: `0 ${T / 2} -6`, color: tema.dindingBelakang }, wadah);
    buatEl('a-box', { width: 16.6, height: T, depth: 0.3, position: `0 ${T / 2} 8.15`, color: tema.dinding }, wadah);
    buatEl('a-box', { width: 0.3, height: T, depth: 14.6, position: `-8.15 ${T / 2} 1`, color: tema.dinding }, wadah);
    buatEl('a-box', { width: 0.3, height: T, depth: 14.6, position: `8.15 ${T / 2} 1`, color: tema.dinding }, wadah);

    // Lampu Reaktor di tengah plafon
    const reaktor = buatEl('a-entity', { position: '0 0 1' }, wadah);
    buatEl('a-cylinder', { radius: 0.025, height: 0.9, position: '0 4.1 0', color: '#475569' }, reaktor);
    const bolaLampu = buatEl('a-sphere', {
      radius: 0.32,
      position: '0 3.35 0',
      animation: 'property: scale; from: 1 1 1; to: 1.08 1.08 1.08; dir: alternate; dur: 1200; loop: true; easing: easeInOutSine'
    }, reaktor);
    const sinarLampu = buatEl('a-entity', { position: '0 3.35 0' }, reaktor);

    // Ketiga kristal dipindahkan ke dekat dinding belakang (berlawanan arah dengan pintu, z = 6.7)
    const kristalMesh = [];
    MISI.forEach((m, i) => {
      const x = (i - 1) * 1.45;
      buatEl('a-cylinder', { radius: 0.42, height: 0.9, position: `${x} 0.45 6.7`, color: tema.objek }, wadah);
      const okta = buatEl('a-octahedron', {
        radius: 0.26,
        position: `${x} 1.42 6.7`,
        animation: 'property: rotation; to: 0 360 0; dur: 5000; loop: true; easing: linear'
      }, wadah);
      kristalMesh.push({ el: okta, m });
      const plakatK = buatEl('a-entity', { position: `${x} 1.98 6.7`, rotation: '0 180 0' }, wadah);
      buatPlakat(plakatK, m.nama.toUpperCase(), '0 0 0', 1.4, 0.38, tema, { wrap: 12, aksen: m.warna, hadap: false });
    });

    // Panel MISI SELESAI statis di dinding belakang (z = 7.92, menghadap ke dalam ruangan) tepat di atas kristal
    const panelSelesai = buatEl('a-entity', { position: '0 3.15 7.92', rotation: '0 180 0', visible: false }, wadah);
    buatEl('a-box', { width: 7.4, height: 0.65, depth: 0.06, color: tema.papan }, panelSelesai);
    buatEl('a-box', { width: 7.4, height: 0.05, depth: 0.07, position: '0 -0.32 0', material: 'shader: flat; color: #facc15' }, panelSelesai);
    buatEl('a-text', {
      value: 'MISI SELESAI! REAKTOR CAHAYA AKTIF',
      align: 'center',
      color: '#facc15',
      width: 6.9,
      'wrap-count': 36,
      position: '0 0.02 0.04'
    }, panelSelesai);

    const segarkanLobi = () => {
      const n = jmlKristal();
      bolaLampu.setAttribute('material', `color: ${tema.lampu}; emissive: ${tema.lampu}; emissiveIntensity: ${0.25 + 0.45 * n}`);
      sinarLampu.setAttribute('light', `type: point; color: #fde68a; intensity: ${0.4 + 0.45 * n}; distance: 18; decay: 1.5`);
      kristalMesh.forEach(({ el, m }) => {
        const ada = !!PROG[m.k];
        el.setAttribute('material', ada
          ? `color: ${m.warna}; emissive: ${m.warna}; emissiveIntensity: 0.9`
          : 'color: #334155; opacity: 0.55; transparent: true');
      });
      panelSelesai.setAttribute('visible', n === 3);
    };
    segarkanLobi();
    daftarSegarLobi.push(segarkanLobi);

    // Papan Dinding Kiri & Kanan yang sejajar (y = 2.25, height = 3.2) & ditengahkan simetris
    const buatPapanDinding = (pos, rot, judul, baris, lebarPapan = 4.6) => {
      const p = buatEl('a-entity', { position: pos, rotation: rot }, wadah);
      buatEl('a-box', { width: lebarPapan, height: 3.2, depth: 0.06, color: tema.papan }, p);
      buatEl('a-box', { width: lebarPapan, height: 0.06, depth: 0.08, position: '0 1.6 0', material: `shader: flat; color: ${tema.lampu}` }, p);
      const xKiri = -lebarPapan / 2 + 0.32;
      buatEl('a-text', {
        value: judul,
        color: tema.lampu,
        align: 'left',
        anchor: 'left',
        baseline: 'top',
        width: lebarPapan - 0.65,
        'wrap-count': 28,
        position: `${xKiri} 1.32 0.04`
      }, p);

      baris.forEach((b, i) => {
        buatEl('a-text', {
          value: b,
          color: i === baris.length - 1 ? '#cbd5e1' : '#ffffff',
          align: 'left',
          anchor: 'left',
          baseline: 'top',
          width: lebarPapan - 0.65,
          'wrap-count': 42,
          // Jarak ekstra di bawah judul kuning (mulai di y = 0.56)
          position: `${xKiri} ${0.56 - i * 0.68} 0.04`
        }, p);
      });
    };

    // Dinding Kiri: dua papan sejajar & simetris di tengah dinding (z = 3.2 dan z = -1.6)
    buatPapanDinding('-7.9 2.25 3.2', '0 90 0', 'PEMBELAJARAN TRANSFORMATIF VR: GERBANG LOGIKA DASAR', [
      'Gerbang logika sering terasa abstrak saat hanya digambar di papan tulis.',
      'Di ruang VR ini Anda dapat mengamati simbol, menguji saklar Logisim, dan membuktikan tabel kebenaran.',
      'Masuki ketiga portal di depan secara berurutan.'
    ], 4.8);

    const idn = buatEl('a-entity', { position: '-7.9 2.25 -1.6', rotation: '0 90 0' }, wadah);
    buatEl('a-box', { width: 3.6, height: 3.2, depth: 0.06, color: tema.papan }, idn);
    buatEl('a-box', { width: 3.6, height: 0.06, depth: 0.08, position: '0 1.6 0', material: `shader: flat; color: ${tema.lampu}` }, idn);
    buatEl('a-plane', { width: 1.35, height: 1.35, position: '0 0.85 0.04', material: 'src: #aset-logo-ung; transparent: true; shader: flat' }, idn);
    const tulisIdn = (v, y, c, w) => buatEl('a-text', { value: v, align: 'center', color: c, width: 3.2, 'wrap-count': w, position: `0 ${y} 0.04` }, idn);
    tulisIdn('PENYUSUN', -0.02, tema.lampu, 24);
    tulisIdn('Ahmad Ardani Latodjo (522424009)', -0.36, '#ffffff', 30);
    tulisIdn('MATA KULIAH', -0.82, tema.lampu, 24);
    tulisIdn('Desain Digital dan Logika', -1.16, '#ffffff', 28);

    // Dinding Kanan: ditengahkan tepat di tengah dinding (z = 1.0)
    buatPapanDinding('7.9 2.25 1.0', '0 -90 0', 'ALUR PRAKTIKUM', [
      'Kumpulkan tiga kristal untuk menyalakan kembali reaktor cahaya di tengah lobi:',
      '1. Materi: pelajari 7 gerbang dasar.\n2. Simulator: lengkapi 4 tabel kebenaran.\n3. Kuis: jawab 8 studi kasus logika.'
    ], 5.0);

    const pesanKunci = [
      '',
      'Raih kristal Materi dulu untuk membuka Simulator.',
      'Raih kristal Simulator dulu untuk membuka Kuis.'
    ];
    MISI.forEach((m, i) => {
      const x = (i - 1) * 4;
      buatEl('a-plane', {
        rotation: '-90 0 0',
        width: 0.65,
        height: 8,
        position: `${x} 0.02 -1.5`,
        material: `shader: flat; color: ${m.warna}; opacity: 0.7; transparent: true`
      }, wadah);

      buatPintu(wadah, tema, 'lobi', {
        pos: `${x} 0 -5.8`,
        tujuan: m.ruang,
        warna: m.warna,
        judul: m.nama.toUpperCase(),
        sub: m.sub,
        kunci: () => !terbuka(m.k),
        pesan: pesanKunci[i]
      });
    });
  },

  /* 2. ZONA 1: GALERI GERBANG (MATERI) */
  bangunMateri(tema) {
    const wadah = document.getElementById('ruang-materi');
    const AKSEN = '#38bdf8';
    bangunKotakRuang(wadah, tema, { lebar: 26, dalam: 22, tinggi: 5.6 }, AKSEN);
    bangunJudulDinding(wadah, tema, 22, 5.6, 'GALERI GERBANG LOGIKA', 'Klik podium untuk melihat simulasi & detail Logisim Evolution', AKSEN);

    buatPintu(wadah, tema, 'materi', { pos: '-12.95 0 0', rot: 90, tujuan: 'lobi', warna: '#94a3b8', judul: 'LOBI', sub: 'Kembali' });
    buatPintu(wadah, tema, 'materi', {
      pos: '12.95 0 0',
      rot: -90,
      tujuan: 'simulator',
      warna: MISI[1].warna,
      judul: 'SIMULATOR',
      sub: MISI[1].sub,
      kunci: () => !terbuka('simulator'),
      pesan: 'Pelajari ketujuh gerbang dulu untuk membuka Lab Saklar.'
    });

    buatEl('a-cylinder', { radius: 2.4, height: 0.14, position: '0 0.07 1', color: tema.objek }, wadah);
    const cincinP = buatEl('a-torus', { radius: 2.4, 'radius-tubular': 0.06, rotation: '90 0 0', position: '0 0.16 1', color: AKSEN }, wadah);
    const holo = buatEl('a-entity', { position: '0 3.1 1', 'hadap-pemain': '' }, wadah);
    const nama = buatPlakat(holo, '', '-0.35 -1.25 0', 4.4, 0.62, tema, { wrap: 28, hadap: false });

    const grupInfo = buatEl('a-entity', { position: '-7 2.55 1', 'hadap-pemain': '' }, wadah);
    const desk = buatPlakat(grupInfo, '', '0 0.35 0', 5.8, 2.25, tema, { wrap: 38, hadap: false });

    const btnDetail = buatEl('a-box', {
      class: 'klik',
      width: 3.8,
      height: 0.58,
      depth: 0.12,
      position: '0 -1.15 0.04',
      color: '#0284c7'
    }, grupInfo);
    buatEl('a-text', { value: 'BACA DETAIL & LOGISIM', align: 'center', color: '#ffffff', width: 3.5, 'wrap-count': 24, position: '0 0 0.07' }, btnDetail);

    const hTabel = buatEl('a-entity', { position: '7 2.65 1', scale: '1.15 1.15 1.15', 'hadap-pemain': '' }, wadah);
    buatPlakat(hTabel, 'TABEL KEBENARAN', '0 1.52 0', 2.45, 0.45, tema, { wrap: 18, aksen: '#38bdf8', hadap: false });
    const tabel = buatPapanTabel(hTabel, '0 0 0', tema);

    const hitung = buatPlakat(wadah, '', '0 1 4.6', 5.2, 0.54, tema, { wrap: 40 });

    const sudah = new Set(PROG.mat || []);
    const podium = [];
    const cincin = [];
    let panggung = null;
    let timer = null;
    let aktif = -1;

    const pilih = (i, catat = true) => {
      clearInterval(timer);
      if (panggung) panggung.hapus();
      if (aktif >= 0) podium[aktif].setAttribute('material', { emissiveIntensity: 0 });
      aktif = i;

      const j = JENIS_GERBANG[i];
      const d = DATA_GERBANG[j];
      podium[i].setAttribute('material', { emissive: d.warna, emissiveIntensity: 0.55 });
      cincinP.setAttribute('material', { color: d.warna, emissive: d.warna, emissiveIntensity: 0.75 });

      panggung = bangunGerbang(holo, j, { pos: '-0.35 0 0', skala: 1.15 });
      nama.setAttribute('value', `${d.nama.toUpperCase()}  (${d.boolean})`);
      desk.setAttribute('value', `${d.deskripsi}\n\nLogisim: ${d.logisim}`);

      btnDetail.onclick = () => {
        if (ruangAktif !== 'materi') return;
        Suara.klik();
        UI.tampilInspeksi(j);
      };

      const baris = tabel.isi(j);
      let k = 0;
      const jalan = () => {
        tabel.reset();
        tabel.sorot(k, KABEL_ON);
        panggung.set(...baris[k]);
        k = (k + 1) % baris.length;
      };
      jalan();
      timer = setInterval(jalan, 1600);

      if (catat) {
        Suara.klik();
        if (!sudah.has(i)) {
          sudah.add(i);
          PROG.mat = [...sudah];
          simpanProgres();
          cincin[i].setAttribute('material', { color: KABEL_ON, emissive: KABEL_ON, emissiveIntensity: 0.9 });
          UI.perbaruiHUD();
          notif(`Materi ${j} tercatat (${sudah.size}/7 gerbang)`);
          if (sudah.size === 7) raihKristal('materi');
        }
      }
      hitung.setAttribute('value', `Dipelajari: ${sudah.size}/7 gerbang · Klik podium untuk inspeksi`);
    };

    btnDetail.addEventListener('mouseenter', () => {
      if (ruangAktif === 'materi') tampilAksi('Klik untuk membuka panel materi & narasi suara');
    });
    btnDetail.addEventListener('mouseleave', () => tampilAksi(null));

    JENIS_GERBANG.forEach((j, i) => {
      const th = ((-69 + i * 23) * Math.PI) / 180;
      const x = 8 * Math.sin(th);
      const z = -1.5 - 8 * Math.cos(th);
      const w = DATA_GERBANG[j].warna;

      const p = buatEl('a-cylinder', { class: 'klik', radius: 0.8, height: 0.9, position: `${x} 0.45 ${z}`, color: tema.objek }, wadah);
      buatEl('a-torus', { radius: 0.8, 'radius-tubular': 0.05, rotation: '90 0 0', position: `${x} 0.9 ${z}`, material: `shader: flat; color: ${w}` }, wadah);
      cincin[i] = buatEl('a-torus', {
        radius: 1.05,
        'radius-tubular': 0.05,
        rotation: '90 0 0',
        position: `${x} 0.03 ${z}`,
        material: sudah.has(i) ? `color: ${KABEL_ON}; emissive: ${KABEL_ON}; emissiveIntensity: 0.9` : 'color: #64748b'
      }, wadah);

      const putar = buatEl('a-entity', {
        position: `${x} 1.8 ${z}`,
        animation: 'property: rotation; to: 0 360 0; dur: 14000; loop: true; easing: linear'
      }, wadah);
      bangunGerbang(putar, j, { skala: 0.8, kabelOn: false });
      buatPlakat(wadah, j, `${x} 1.2 ${z + 0.9}`, 1.5, 0.4, tema, { wrap: 8, aksen: w });

      p.addEventListener('mouseenter', () => {
        if (ruangAktif !== 'materi') return;
        tampilAksi(`Klik untuk mengamati Gerbang ${j}`);
        if (aktif !== i) p.setAttribute('material', { emissive: w, emissiveIntensity: 0.35 });
      });
      p.addEventListener('mouseleave', () => {
        tampilAksi(null);
        if (aktif !== i) p.setAttribute('material', { emissiveIntensity: 0 });
      });
      p.addEventListener('click', () => {
        if (ruangAktif === 'materi') pilih(i, true);
      });
      podium.push(p);
    });

    pilih(1, false);
  },

  /* 3. ZONA 2: LAB SAKLAR (SIMULATOR) */
  bangunSimulator(tema) {
    const wadah = document.getElementById('ruang-simulator');
    const AKSEN = '#f59e0b';
    const Y0 = 2.05;
    const TARGET = 4;

    bangunKotakRuang(wadah, tema, { lebar: 22, dalam: 18, tinggi: 5.6 }, AKSEN);
    bangunJudulDinding(wadah, tema, 18, 5.6, 'LAB SAKLAR LOGISIM', 'Pilih gerbang di meja kanan, lalu uji saklar input di papan utama', AKSEN);

    // Pintu Kembali & Pintu Lanjut
    buatPintu(wadah, tema, 'simulator', { pos: '-10.95 0 2.5', rot: 90, tujuan: 'materi', warna: MISI[0].warna, judul: 'MATERI', sub: MISI[0].sub });
    buatPintu(wadah, tema, 'simulator', {
      pos: '10.95 0 6.2',
      rot: -90,
      tujuan: 'kuis',
      warna: MISI[2].warna,
      judul: 'KUIS',
      sub: MISI[2].sub,
      kunci: () => !terbuka('kuis'),
      pesan: 'Lengkapi tabel kebenaran 4 gerbang dulu untuk membuka Arena Uji.'
    });

    // 1. PANEL SIMULASI UTAMA (dinding belakang tengah-kanan)
    buatEl('a-box', { width: 10.6, height: 3.3, depth: 0.1, position: `1.5 ${Y0} -8.88`, color: tema.papan }, wadah);
    buatEl('a-box', { width: 10.6, height: 0.09, depth: 0.12, position: `1.5 ${Y0 - 1.65} -8.88`, material: `shader: flat; color: ${AKSEN}` }, wadah);

    // 2. PAPAN TABEL KEBENARAN TEPAT DI SEBELAH KIRI PANEL SIMULASI (DINDING DEPAN)
    const hT = buatEl('a-entity', { position: `-6.2 ${Y0 - 0.15} -8.86`, scale: '1.1 1.1 1.1' }, wadah);
    buatPlakat(hT, 'TABEL KEBENARAN', '0 1.95 0', 2.6, 0.42, tema, { wrap: 18, aksen: '#38bdf8', hadap: false });
    const tabel = buatPapanTabel(hT, '0 0 0', tema);
    const label = buatPlakat(hT, '', '0 1.46 0', 2.6, 0.44, tema, { wrap: 20, hadap: false });

    // 3. MEJA PEMILIHAN GERBANG DI DINDING KANAN
    const rakGerbang = buatEl('a-entity', { position: '9.3 0 -0.5', rotation: '0 -90 0' }, wadah);
    buatEl('a-box', { width: 10.6, height: 0.72, depth: 1.1, position: '0 0.36 0', color: tema.objek }, rakGerbang);
    const misi = buatPlakat(rakGerbang, '', '0 2.35 -0.45', 8.4, 0.56, tema, { wrap: 58, hadap: false });

    const coba = PROG.sim || (PROG.sim = {});
    const jmlBaris = (j) => (j === 'NOT' ? 2 : 4);
    const selesai = () => JENIS_GERBANG.filter((j) => (coba[j] || []).length >= jmlBaris(j)).length;

    let gate = null;
    let jenis = 'AND';
    let A = 0;
    let B = 0;
    let aktif = -1;
    const saklar = {};
    const chip = [];

    const tampilSaklar = (s) => {
      s.knob.setAttribute('animation', {
        property: 'position',
        to: `${s.nilai ? -2.05 : -2.55} ${s.y} -8.72`,
        dur: 160,
        easing: 'easeOutQuad'
      });
      s.knob.setAttribute('material', {
        color: s.nilai ? KABEL_ON : '#94a3b8',
        emissive: s.nilai ? KABEL_ON : '#000000',
        emissiveIntensity: 0.85
      });
    };

    const segar = () => {
      const c = coba[jenis] || [];
      const k = jenis === 'NOT' ? A : A * 2 + B;
      tabel.reset();
      c.forEach((i) => tabel.sorot(i, '#38bdf8'));
      tabel.sorot(k, KABEL_ON);
      misi.setAttribute('value', `Tabel kebenaran lengkap: ${selesai()}/${TARGET} gerbang · Pilih gerbang di bawah`);
    };

    const perbarui = () => {
      gate.set(A, B);
      const k = jenis === 'NOT' ? A : A * 2 + B;
      const c = coba[jenis] || (coba[jenis] = []);
      if (!c.includes(k)) {
        c.push(k);
        simpanProgres();
        UI.perbaruiHUD();
      }
      segar();
      if (selesai() >= TARGET) raihKristal('simulator');
    };

    const buatSaklar = (nama, yAwal) => {
      const grup = buatEl('a-entity', { position: '0 0 0' }, wadah);
      const teks = buatEl('a-text', { value: nama, align: 'center', color: '#facc15', width: 1.6, 'wrap-count': 3, position: `-3.15 ${yAwal} -8.8` }, grup);
      const dasar = buatEl('a-box', { class: 'klik', width: 1.1, height: 0.46, depth: 0.1, position: `-2.3 ${yAwal} -8.8`, color: '#1e293b' }, grup);
      const knob = buatEl('a-sphere', { class: 'klik', radius: 0.2, position: `-2.55 ${yAwal} -8.72`, material: 'color: #94a3b8' }, grup);

      const s = {
        grup,
        teks,
        dasar,
        knob,
        y: yAwal,
        nilai: 0,
        aturY(yBaru) {
          this.y = yBaru;
          teks.setAttribute('position', `-3.15 ${yBaru} -8.8`);
          dasar.setAttribute('position', `-2.3 ${yBaru} -8.8`);
          knob.setAttribute('position', `${this.nilai ? -2.05 : -2.55} ${yBaru} -8.72`);
        }
      };

      const balik = () => {
        if (ruangAktif !== 'simulator') return;
        if (nama === 'B' && jenis === 'NOT') return;
        s.nilai = s.nilai ? 0 : 1;
        Suara.saklar(s.nilai);
        tampilSaklar(s);
        if (nama === 'A') A = s.nilai; else B = s.nilai;
        perbarui();
      };

      [dasar, knob].forEach((el) => {
        el.addEventListener('mouseenter', () => {
          if (ruangAktif === 'simulator') tampilAksi(`Klik untuk mengubah input ${nama} (${s.nilai ? '1 → 0' : '0 → 1'})`);
        });
        el.addEventListener('mouseleave', () => tampilAksi(null));
        el.addEventListener('click', balik);
      });
      saklar[nama] = s;
    };

    buatSaklar('A', Y0 + 0.375);
    buatSaklar('B', Y0 - 0.375);

    const pilih = (i, bunyi = true) => {
      if (bunyi) Suara.klik();
      if (gate) gate.hapus();
      if (aktif >= 0) {
        const o = chip[aktif];
        o.c.setAttribute('material', { emissiveIntensity: 0 });
        o.g.setAttribute('animation', { property: 'position', to: `${o.x} 1.25 0`, dur: 150 });
      }
      aktif = i;
      jenis = JENIS_GERBANG[i];
      A = B = 0;

      const o = chip[i];
      const w = DATA_GERBANG[jenis].warna;
      o.c.setAttribute('material', { emissive: w, emissiveIntensity: 0.55 });
      o.g.setAttribute('animation', { property: 'position', to: `${o.x} 1.45 0`, dur: 150 });

      gate = bangunGerbang(wadah, jenis, { pos: `2.5 ${Y0} -8.75`, skala: 1.5, awal: -2.8 });
      label.setAttribute('value', `${jenis} (${DATA_GERBANG[jenis].boolean})`);
      tabel.isi(jenis);

      const satuInput = jenis === 'NOT';
      saklar.A.nilai = 0;
      saklar.B.nilai = 0;
      saklar.A.aturY(satuInput ? Y0 : Y0 + 0.375);
      saklar.B.aturY(Y0 - 0.375);

      // Sembunyikan input B sepenuhnya saat gerbang NOT dipilih
      saklar.B.grup.setAttribute('visible', !satuInput);
      if (satuInput) {
        saklar.B.dasar.classList.remove('klik', 'klik-aktif');
        saklar.B.knob.classList.remove('klik', 'klik-aktif');
      } else {
        saklar.B.dasar.classList.add('klik');
        saklar.B.knob.classList.add('klik');
        if (ruangAktif === 'simulator') {
          saklar.B.dasar.classList.add('klik-aktif');
          saklar.B.knob.classList.add('klik-aktif');
        }
      }

      tampilSaklar(saklar.A);
      tampilSaklar(saklar.B);
      perbarui();
    };

    JENIS_GERBANG.forEach((j, i) => {
      const x = -4.5 + i * 1.5;
      const w = DATA_GERBANG[j].warna;
      const g = buatEl('a-entity', { position: `${x} 1.25 0`, rotation: '-18 0 0' }, rakGerbang);
      const c = buatEl('a-box', { class: 'klik', width: 1.2, height: 1.2, depth: 0.08, color: '#0f172a' }, g);
      buatEl('a-box', { width: 1.2, height: 0.09, depth: 0.09, position: '0 -0.6 0', material: `shader: flat; color: ${w}` }, g);
      bangunGerbang(g, j, { kabelOn: false, skala: 0.45, pos: '0.1 0.18 0.06' });
      buatEl('a-text', { value: j, align: 'center', color: '#ffffff', width: 1.7, 'wrap-count': 6, position: '0 -0.4 0.06' }, g);

      c.addEventListener('mouseenter', () => {
        if (ruangAktif !== 'simulator') return;
        tampilAksi(`Klik untuk memasang Gerbang ${j} ke papan simulasi`);
        if (aktif !== i) c.setAttribute('material', { emissive: w, emissiveIntensity: 0.35 });
      });
      c.addEventListener('mouseleave', () => {
        tampilAksi(null);
        if (aktif !== i) c.setAttribute('material', { emissiveIntensity: 0 });
      });
      c.addEventListener('click', () => {
        if (ruangAktif === 'simulator') pilih(i, true);
      });
      chip.push({ g, c, x });
    });

    pilih(1, false);
  },

  /* 4. ZONA 3: ARENA UJI (KUIS) */
  bangunKuis(tema) {
    const wadah = document.getElementById('ruang-kuis');
    const AKSEN = '#2ecc71';
    const JML = 8;
    const NYAWA = 3;
    const DWELL = 5000; // 5 detik untuk mengunci jawaban

    bangunKotakRuang(wadah, tema, { lebar: 20, dalam: 18, tinggi: 5.6 }, AKSEN);
    bangunJudulDinding(wadah, tema, 18, 5.6, 'ARENA UJI LOGIKA', 'Berjalan & berdiri di atas pad jawaban (0 atau 1) selama 5 detik', AKSEN);

    buatPintu(wadah, tema, 'kuis', { pos: '-9.95 0 0', rot: 90, tujuan: 'simulator', warna: MISI[1].warna, judul: 'SIMULATOR', sub: MISI[1].sub });
    buatPintu(wadah, tema, 'kuis', { pos: '9.95 0 0', rot: -90, tujuan: 'lobi', warna: '#94a3b8', judul: 'LOBI', sub: 'Kembali' });

    // Panel Soal di tengah
    const ps = buatEl('a-entity', { position: '0 2.65 -8.85' }, wadah);
    buatEl('a-box', { width: 8.6, height: 1.9, depth: 0.06, color: tema.papan }, ps);
    buatEl('a-box', { width: 8.6, height: 0.06, depth: 0.08, position: '0 -0.95 0', material: `shader: flat; color: ${AKSEN}` }, ps);
    const nomor = buatEl('a-text', { value: '', align: 'left', anchor: 'left', color: '#facc15', width: 8.0, 'wrap-count': 34, position: '-4.0 0.62 0.04' }, ps);
    const soal = buatEl('a-text', { value: '', align: 'left', anchor: 'left', baseline: 'top', color: '#ffffff', width: 8.0, 'wrap-count': 38, position: '-4.0 0.32 0.04' }, ps);

    const nyawaEl = [0, 1, 2].map((i) => buatEl('a-sphere', {
      radius: 0.15,
      position: `${3.1 + i * 0.38} 0.62 0.05`,
      material: 'color: #facc15; emissive: #facc15'
    }, ps));

    // Papan Info Jawaban SALAH di sisi KIRI dengan jarak rapi antara judul & isi teks
    const panelSalah = buatEl('a-entity', { position: '-6.95 2.4 -8.85' }, wadah);
    buatEl('a-box', { width: 4.5, height: 2.75, depth: 0.06, color: tema.papan }, panelSalah);
    buatEl('a-box', { width: 4.5, height: 0.07, depth: 0.08, position: '0 1.375 0', material: 'shader: flat; color: #ef4444' }, panelSalah);
    buatEl('a-text', { value: 'JAWABAN SALAH', align: 'center', color: '#f87171', width: 4.0, 'wrap-count': 20, position: '0 1.08 0.04' }, panelSalah);
    buatEl('a-box', { width: 3.8, height: 0.02, depth: 0.07, position: '0 0.82 0.03', material: 'shader: flat; color: #334155' }, panelSalah);
    const teksSalah = buatEl('a-text', {
      value: 'Belum ada kesalahan.',
      align: 'center',
      baseline: 'top',
      color: '#cbd5e1',
      width: 3.9,
      'wrap-count': 28,
      position: '0 0.62 0.04'
    }, panelSalah);

    // Papan Info Jawaban BENAR di sisi KANAN dengan jarak rapi antara judul & isi teks
    const panelBenar = buatEl('a-entity', { position: '6.95 2.4 -8.85' }, wadah);
    buatEl('a-box', { width: 4.5, height: 2.75, depth: 0.06, color: tema.papan }, panelBenar);
    buatEl('a-box', { width: 4.5, height: 0.07, depth: 0.08, position: '0 1.375 0', material: 'shader: flat; color: #2ecc71' }, panelBenar);
    buatEl('a-text', { value: 'JAWABAN BENAR', align: 'center', color: '#4ade80', width: 4.0, 'wrap-count': 20, position: '0 1.08 0.04' }, panelBenar);
    buatEl('a-box', { width: 3.8, height: 0.02, depth: 0.07, position: '0 0.82 0.03', material: 'shader: flat; color: #334155' }, panelBenar);
    const teksBenar = buatEl('a-text', {
      value: 'Berdiri di pad jawaban (0 atau 1) selama 5 detik.',
      align: 'center',
      baseline: 'top',
      color: '#cbd5e1',
      width: 3.9,
      'wrap-count': 28,
      position: '0 0.62 0.04'
    }, panelBenar);

    const holo = buatEl('a-entity', { position: '0 1.45 -2.2', 'hadap-pemain': '' }, wadah);
    let gate = null;

    const buatSoal = () => Array.from({ length: JML }, (_, i) => {
      const j = JENIS_GERBANG[Math.floor(Math.random() * (i < 4 ? 3 : 7))];
      const a = Math.round(Math.random());
      const b = Math.round(Math.random());
      return { j, a, b, level: i < 4 ? 1 : 2, benar: DATA_GERBANG[j].fn(a, b) };
    });

    let S = buatSoal();
    let no = 0;
    let nyawa = NYAWA;
    let skor = 0;
    let kunciJawab = false;
    let bebas = true;
    let dwell = 0;
    let detikTerakhir = 0;

    const PADS = [
      { v: 0, x: -3.2, z: 1.5, r: 1.65, c: '#38bdf8' },
      { v: 1, x: 3.2, z: 1.5, r: 1.65, c: '#2ecc71' }
    ];

    PADS.forEach((q) => {
      buatEl('a-cylinder', { radius: q.r, height: 0.12, position: `${q.x} 0.06 ${q.z}`, color: tema.objek }, wadah);
      buatEl('a-torus', { radius: q.r, 'radius-tubular': 0.07, rotation: '90 0 0', position: `${q.x} 0.13 ${q.z}`, material: `shader: flat; color: ${q.c}` }, wadah);
      q.disc = buatEl('a-cylinder', {
        radius: q.r - 0.1,
        height: 0.15,
        position: `${q.x} 0.08 ${q.z}`,
        scale: '0.001 1 0.001',
        material: `shader: flat; color: ${q.c}; opacity: 0.85; transparent: true`
      }, wadah);
      buatPlakat(wadah, `OUTPUT = ${q.v}`, `${q.x} 1.75 ${q.z}`, 1.8, 0.55, tema, { wrap: 14, aksen: q.c });
      buatEl('a-text', {
        value: 'BERDIRI DI SINI (5 DETIK)',
        align: 'center',
        color: tema.teks,
        width: 3.4,
        'wrap-count': 24,
        rotation: '-90 0 0',
        position: `${q.x} 0.16 ${q.z + 2.0}`
      }, wadah);
    });

    const pulihPad = () => PADS.forEach((q) => q.disc.setAttribute('material', { color: q.c }));
    const lampuNyawa = () => nyawaEl.forEach((e, i) => e.setAttribute('material', {
      color: i < nyawa ? '#facc15' : '#475569',
      emissive: i < nyawa ? '#facc15' : '#000000'
    }));

    const tampil = () => {
      lampuNyawa();
      kunciJawab = false;
      pulihPad();
      if (gate) gate.hapus();

      if (no >= JML) {
        nomor.setAttribute('value', 'EVALUASI SELESAI');
        soal.setAttribute('value', `Skor akhir: ${skor}/${JML}. Kristal Kuis diraih! Silakan kembali ke Lobi lewat pintu kanan.`);
        teksBenar.setAttribute('value', `Selamat! Seluruh ${JML} soal telah diselesaikan dengan skor ${skor}/${JML}.`);
        PROG.skorKuis = Math.max(PROG.skorKuis || 0, skor);
        simpanProgres();
        raihKristal('kuis');
        return;
      }

      const s = S[no];
      gate = bangunGerbang(holo, s.j, { skala: 0.95, kabelOn: false });
      nomor.setAttribute('value', `LEVEL ${s.level} · SOAL ${no + 1} DARI ${JML}`);
      soal.setAttribute('value', s.j === 'NOT'
        ? `Gerbang NOT (${DATA_GERBANG.NOT.boolean}), input A = ${s.a}. Berapa nilai output Y?`
        : `Gerbang ${s.j} (${DATA_GERBANG[s.j].boolean}), input A = ${s.a} dan B = ${s.b}. Berapa nilai output Y?`);
    };

    const jawab = (v) => {
      if (kunciJawab || no >= JML) return;
      kunciJawab = true;
      const s = S[no];
      const ok = v === s.benar;
      PADS[v].disc.setAttribute('material', { color: ok ? '#2ecc71' : '#ef4444' });

      if (ok) {
        Suara.benar();
        skor++;
        no++;
        teksBenar.setAttribute('value', `Tepat! Output Y = ${s.benar} untuk Gerbang ${s.j}.\n\nMelanjutkan ke soal berikutnya...`);
        teksSalah.setAttribute('value', '-');
        setTimeout(tampil, 1300);
        return;
      }

      Suara.salah();
      nyawa--;
      lampuNyawa();
      teksBenar.setAttribute('value', '-');
      if (nyawa <= 0) {
        teksSalah.setAttribute('value', 'Kesempatan habis. Soal diacak ulang, silakan coba kembali!');
        setTimeout(() => {
          S = buatSoal();
          no = 0;
          nyawa = NYAWA;
          skor = 0;
          teksSalah.setAttribute('value', 'Belum ada kesalahan.');
          teksBenar.setAttribute('value', 'Berdiri di pad jawaban (0 atau 1) selama 5 detik.');
          tampil();
        }, 2400);
      } else {
        teksSalah.setAttribute('value', `Belum tepat (pilihan: ${v}). ${DATA_GERBANG[s.j].deskripsi}\n\nMelangkah keluar lingkaran dulu.`);
        setTimeout(() => {
          kunciJawab = false;
          pulihPad();
        }, 1600);
      }
    };

    if (!AFRAME.components['pantau-pad']) {
      AFRAME.registerComponent('pantau-pad', {
        tick(t, dt) {
          if (ruangAktif !== 'kuis' || UI.layar !== 'main' || kunciJawab || no >= JML || !dt) return;
          const pemainEl = document.getElementById('pemain');
          if (!pemainEl) return;
          const pos = pemainEl.object3D.position;

          let di = -1;
          PADS.forEach((q, i) => {
            if (Math.hypot(pos.x - q.x, pos.z - q.z) <= q.r) di = i;
          });

          PADS.forEach((q, i) => {
            if (i !== di || !bebas) q.disc.object3D.scale.set(0.001, 1, 0.001);
          });

          if (di < 0) {
            bebas = true;
            dwell = 0;
            detikTerakhir = 0;
            return;
          }
          if (!bebas) return;

          dwell += Math.min(dt, 100);
          const langkahDetik = Math.floor(dwell / 1000);
          if (langkahDetik > detikTerakhir && langkahDetik < 5) {
            detikTerakhir = langkahDetik;
            Suara.progresPad(langkahDetik);
          }

          const f = Math.min(1, dwell / DWELL);
          PADS[di].disc.object3D.scale.set(f, 1, f);
          if (f >= 1) {
            bebas = false;
            dwell = 0;
            detikTerakhir = 0;
            jawab(di);
          }
        }
      });
    }
    buatEl('a-entity', { 'pantau-pad': '' }, wadah);

    tampil();
  }
});