/* ==========================================================================
   sistem.js — PENGELOLA STATUS, PROGRES, TRANSISI RUANG, KURSOR & UI
   ========================================================================== */

const MODE_GAME = !AFRAME.utils.device.isMobile();
document.documentElement.classList.add(MODE_GAME ? 'perangkat-game' : 'perangkat-sentuh');

let PROG = {};
try {
  PROG = JSON.parse(localStorage.getItem('vr-logisim-progres')) || {};
} catch (e) {
  PROG = {};
}

const Pengaturan = {
  KUNCI: 'vr-logisim-pengaturan',
  data: {
    tema: 'gelap',
    kualitas: MODE_GAME ? 'tinggi' : 'rendah',
    suara: true,
    fov: 80
  },
  muat() {
    try {
      const s = JSON.parse(localStorage.getItem(this.KUNCI) || 'null');
      if (s) Object.assign(this.data, s);
    } catch (e) {}
  },
  simpan() {
    try {
      localStorage.setItem(this.KUNCI, JSON.stringify(this.data));
    } catch (e) {}
  },
  terapkan() {
    Suara.aktif = this.data.suara;
    if (!this.data.suara) {
      Narasi.diam();
      Suara.hentikanBGM();
    } else if (Suara.ctx) {
      Suara.mulaiBGM();
    }

    const kamera = document.getElementById('kamera');
    if (kamera) kamera.setAttribute('camera', 'fov', this.data.fov);

    const scene = document.getElementById('scene-utama');
    if (scene && scene.renderer && !scene.is('vr-mode')) {
      const dpr = window.devicePixelRatio || 1;
      const rasio = this.data.kualitas === 'rendah' ? 1 : Math.max(2, Math.min(dpr * 1.5, 2.5));
      scene.renderer.setPixelRatio(rasio);
    }

    const t = TEMA_LAB[this.data.tema] || TEMA_LAB.gelap;
    if (scene) scene.setAttribute('background', 'color', t.langit);
    const amb = document.getElementById('lampu-amb');
    if (amb) amb.setAttribute('light', 'intensity', t.amb);
  }
};
Pengaturan.muat();

function simpanProgres() {
  try {
    localStorage.setItem('vr-logisim-progres', JSON.stringify(PROG));
  } catch (e) {}
}

function jmlKristal() {
  return MISI.filter((m) => PROG[m.k]).length;
}

function terbuka(k) {
  const i = MISI.findIndex((m) => m.k === k);
  return i === 0 || !!PROG[MISI[i - 1].k];
}

function semuaTerbuka() {
  const semuaKristal = jmlKristal() === MISI.length;
  const semuaMateri = (PROG.mat || []).length >= JENIS_GERBANG.length;
  return semuaKristal && semuaMateri;
}

let ruangAktif = 'lobi';
let sedangPindah = false;
const daftarSegarPintu = [];
const daftarSegarLobi = [];

function notif(teks) {
  const el = document.getElementById('notif');
  if (!el) return;
  el.textContent = teks;
  el.classList.add('tampil');
  clearTimeout(notif._t);
  notif._t = setTimeout(() => el.classList.remove('tampil'), 3400);
}

function raihKristal(k) {
  if (PROG[k]) return;
  PROG[k] = 1;
  simpanProgres();
  Suara.kristal();
  UI.perbaruiHUD();
  daftarSegarPintu.forEach((fn) => fn());
  daftarSegarLobi.forEach((fn) => fn());
  const nama = MISI.find((m) => m.k === k).nama;
  notif(`Kristal ${nama} diraih! (${jmlKristal()}/3)`);
}

function tampilkanRuang(id) {
  ruangAktif = id;
  tampilAksi(null);

  ['lobi', 'materi', 'simulator', 'kuis'].forEach((k) => {
    const wadah = document.getElementById('ruang-' + k);
    if (!wadah) return;
    const aktif = k === id;
    wadah.setAttribute('visible', aktif);

    wadah.querySelectorAll('.klik').forEach((el) => {
      if (aktif) el.classList.add('klik-aktif');
      else el.classList.remove('klik-aktif');
    });
  });

  const info = RUANG_INFO[id];
  const pemain = document.getElementById('pemain');
  if (pemain && info) {
    pemain.object3D.position.set(info.masuk.x, info.masuk.y, info.masuk.z);
    if (pemain.components['pemain-gerak']) {
      pemain.components['pemain-gerak'].aturArah(info.yaw);
      pemain.components['pemain-gerak'].aturRuang(id);
    }
  }

  UI.perbaruiHUD();

  setTimeout(() => {
    const kursor = document.getElementById('kursor-tatap');
    if (kursor && kursor.components.raycaster) {
      kursor.components.raycaster.refreshObjects();
      kursor.components.raycaster.intersectedEls = [];
    }
  }, 50);
}

function pindahRuang(id) {
  if (sedangPindah || !RUANG_INFO[id]) return;
  sedangPindah = true;
  tampilAksi(null);
  Narasi.diam();
  Suara.pintu();
  const tirai = document.getElementById('tirai-layar');
  if (tirai) tirai.classList.add('aktif');

  setTimeout(() => {
    tampilkanRuang(id);
    if (tirai) tirai.classList.remove('aktif');
    sedangPindah = false;
    UI.tampilKartuRuang(id);
  }, 450);
}

const UI = {
  layar: 'menu',
  layarSebelumnya: 'menu',
  aksiKonfirmasi: null,
  indeksMenuAwal: 0,

  siapkan() {
    document.body.classList.toggle('mode-game', MODE_GAME);
    document.body.classList.toggle('mode-sentuh', !MODE_GAME);

    this.setStatusKursor(true);
    this.segarkanRingkasanMenu();

    // Tampilkan Galeri Materi sebagai latar kamera berputar 360° di menu awal
    tampilkanRuang('materi');

    // Mulai backsound sejak di menu awal
    Suara.siapkan();
    const bukaAudioAwal = () => {
      Suara.siapkan();
      if (Suara.ctx && Suara.ctx.state === 'running') {
        window.removeEventListener('pointerdown', bukaAudioAwal);
        window.removeEventListener('keydown', bukaAudioAwal);
      }
    };
    window.addEventListener('pointerdown', bukaAudioAwal);
    window.addEventListener('keydown', bukaAudioAwal);

    // Efek suara hover lembut pada seluruh tombol menu yang aktif
    document.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('pointerenter', () => {
        if (!btn.disabled) Suara.hover();
      });
    });

    // Sinkronisasi sorotan item menu awal saat diarahkan mouse
    const itemMenu = Array.from(document.querySelectorAll('.item-menu-utama'));
    itemMenu.forEach((btn, idx) => {
      btn.addEventListener('pointerenter', () => {
        this.pilihItemMenuAwal(idx, false);
      });
    });

    document.getElementById('btn-mulai').onclick = () => {
      Suara.klik();
      this.mulaiMain();
    };
    document.getElementById('btn-panduan-awal').onclick = () => {
      Suara.klik();
      this.bukaModal('layar-panduan', 'menu');
    };
    document.getElementById('btn-atur-awal').onclick = () => {
      Suara.klik();
      this.bukaPengaturan('menu');
    };

    document.getElementById('btn-jeda').onclick = () => {
      Suara.klik();
      this.bukaJeda();
    };
    document.getElementById('btn-tablet').onclick = () => {
      Suara.klik();
      const tab = document.getElementById('tablet-3d');
      if (tab) tab.setAttribute('visible', !tab.getAttribute('visible'));
    };

    document.getElementById('btn-kembali-main').onclick = () => {
      Suara.klik();
      this.tutupSemuaModal();
      this.setStatusKursor(false);
    };
    document.getElementById('btn-ke-lobi').onclick = () => {
      Suara.klik();
      this.tutupSemuaModal();
      if (ruangAktif !== 'lobi') pindahRuang('lobi');
      this.setStatusKursor(false);
    };
    document.getElementById('btn-ke-menu-awal').onclick = () => {
      Suara.klik();
      this.kembaliKeMenuAwal();
    };
    document.getElementById('btn-atur-jeda').onclick = () => {
      Suara.klik();
      this.bukaPengaturan('jeda');
    };
    document.getElementById('btn-panduan-jeda').onclick = () => {
      Suara.klik();
      this.bukaModal('layar-panduan', 'jeda');
    };

    document.getElementById('btn-demo').onclick = () => {
      if (semuaTerbuka()) return;
      Suara.klik();
      this.bukaKonfirmasi({
        judul: 'AKTIFKAN MODE DEMO?',
        pesan: 'Seluruh 3 Kristal, 7 materi gerbang, 4 tabel kebenaran simulator, dan skor kuis akan langsung dibuka untuk keperluan demonstrasi.',
        teksYa: 'Ya, Buka Semua',
        kelasYa: 'tombol-aksen',
        onYa: () => {
          Suara.kristal();
          MISI.forEach((m) => (PROG[m.k] = 1));
          PROG.mat = [0, 1, 2, 3, 4, 5, 6];
          PROG.sim = {};
          JENIS_GERBANG.slice(0, 4).forEach((j) => (PROG.sim[j] = j === 'NOT' ? [0, 1] : [0, 1, 2, 3]));
          PROG.skorKuis = PROG.skorKuis || 8;
          simpanProgres();
          location.reload();
        }
      });
    };

    document.getElementById('btn-reset').onclick = () => {
      Suara.klik();
      this.bukaKonfirmasi({
        judul: 'RESET SELURUH PROGRES?',
        pesan: 'Semua kristal, catatan materi, tabel kebenaran, dan skor kuis akan dihapus permanen. Pembelajaran akan dimulai ulang dari awal.',
        teksYa: 'Ya, Reset Progres',
        kelasYa: 'tombol-bahaya',
        onYa: () => {
          PROG = {};
          simpanProgres();
          location.reload();
        }
      });
    };

    document.getElementById('btn-konf-batal').onclick = () => {
      Suara.klik();
      this.tutupKonfirmasi();
    };
    document.getElementById('btn-konf-ya').onclick = () => {
      const aksi = this.aksiKonfirmasi;
      this.tutupKonfirmasi();
      if (typeof aksi === 'function') aksi();
    };

    document.getElementById('btn-tutup-atur').onclick = () => {
      const temaLama = Pengaturan.data.tema;
      Pengaturan.data.tema = document.getElementById('atur-tema').value;
      Pengaturan.data.kualitas = document.getElementById('atur-kualitas').value;
      Pengaturan.data.suara = document.getElementById('atur-suara').checked;
      Pengaturan.data.fov = parseInt(document.getElementById('atur-fov').value, 10);
      Pengaturan.simpan();
      Pengaturan.terapkan();
      Suara.klik();
      if (temaLama !== Pengaturan.data.tema) {
        location.reload();
        return;
      }
      this.kembaliDariModal();
    };
    document.getElementById('btn-tutup-panduan').onclick = () => {
      Suara.klik();
      this.kembaliDariModal();
    };

    document.getElementById('btn-tutup-insp').onclick = () => this.tutupInspeksi();
    document.getElementById('btn-selesai-insp').onclick = () => this.tutupInspeksi();

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;

      if (this.layar === 'menu') {
        const daftar = document.querySelectorAll('.item-menu-utama');
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          e.preventDefault();
          this.pilihItemMenuAwal((this.indeksMenuAwal + 1) % daftar.length, true);
          return;
        }
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          this.pilihItemMenuAwal((this.indeksMenuAwal - 1 + daftar.length) % daftar.length, true);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (daftar[this.indeksMenuAwal]) daftar[this.indeksMenuAwal].click();
          return;
        }
      }

      if (e.key === 'c' || e.key === 'C' || e.key === 'Escape') {
        if (this.layar === 'konfirmasi') {
          Suara.klik();
          this.tutupKonfirmasi();
        } else if (this.layar === 'inspeksi') {
          this.tutupInspeksi();
        } else if (this.layar === 'main') {
          Suara.klik();
          this.bukaJeda();
        } else if (this.layar === 'jeda') {
          Suara.klik();
          this.tutupSemuaModal();
          this.setStatusKursor(false);
        }
      } else if ((e.key === 't' || e.key === 'T') && this.layar === 'main') {
        Suara.klik();
        const tab = document.getElementById('tablet-3d');
        if (tab) tab.setAttribute('visible', !tab.getAttribute('visible'));
      }
    });

    const cv = document.querySelector('canvas');
    if (cv) {
      cv.addEventListener('mousedown', () => {
        if (this.layar === 'main' && MODE_GAME && document.pointerLockElement !== cv) {
          this.setStatusKursor(false);
        }
      });
    }

    document.addEventListener('pointerlockchange', () => {
      const canvas = document.querySelector('canvas');
      const terkunci = document.pointerLockElement === canvas;
      document.body.classList.toggle('kursor-terkunci', terkunci);

      if (!terkunci && this.layar === 'main' && MODE_GAME) {
        this.bukaJeda();
      }
    });
  },

  pilihItemMenuAwal(idx, bunyi = true) {
    const daftar = document.querySelectorAll('.item-menu-utama');
    if (!daftar.length) return;
    this.indeksMenuAwal = idx;
    daftar.forEach((el, i) => el.classList.toggle('aktif', i === idx));
    if (bunyi) Suara.hover();
  },

  segarkanRingkasanMenu() {
    const mat = (PROG.mat || []).length;
    const sim = JENIS_GERBANG.filter((j) => ((PROG.sim || {})[j] || []).length >= (j === 'NOT' ? 2 : 4)).length;

    const elMat = document.getElementById('menu-prog-materi');
    const elSim = document.getElementById('menu-prog-sim');
    const elKuis = document.getElementById('menu-prog-kuis');

    if (elMat) elMat.textContent = `${mat} dari 7 gerbang`;
    if (elSim) elSim.textContent = `${Math.min(sim, 4)} dari 4 tabel`;
    if (elKuis) elKuis.textContent = PROG.skorKuis != null ? `Skor ${PROG.skorKuis}/8` : '8 soal';
  },

  bukaKonfirmasi({ judul, pesan, teksYa = 'Ya, Lanjutkan', kelasYa = 'tombol-primer', onYa }) {
    this.layar = 'konfirmasi';
    this.aksiKonfirmasi = onYa;
    document.getElementById('konf-judul').textContent = judul;
    document.getElementById('konf-pesan').textContent = pesan;
    const btnYa = document.getElementById('btn-konf-ya');
    btnYa.textContent = teksYa;
    btnYa.className = kelasYa;
    document.getElementById('layar-jeda').classList.add('sembunyi');
    document.getElementById('layar-konfirmasi').classList.remove('sembunyi');
  },

  tutupKonfirmasi() {
    this.aksiKonfirmasi = null;
    document.getElementById('layar-konfirmasi').classList.add('sembunyi');
    this.bukaJeda();
  },

  setStatusKursor(tampil) {
    document.body.classList.toggle('tampil-kursor-os', tampil);

    // Sembunyikan kursor tatap 3D A-Frame saat menu awal / menu in-game tampil
    const kursor3D = document.getElementById('kursor-tatap');
    if (kursor3D) kursor3D.setAttribute('visible', !tampil);

    if (tampil) {
      if (document.pointerLockElement) {
        try { document.exitPointerLock(); } catch (e) {}
      }
    } else {
      this.kunciKursor();
    }
  },

  kunciKursor() {
    if (!MODE_GAME) return;
    const cv = document.querySelector('canvas');
    if (cv && document.pointerLockElement !== cv) {
      try { cv.requestPointerLock(); } catch (e) {}
    }
  },

  kembaliKeMenuAwal() {
    Narasi.diam();
    tampilAksi(null);
    this.tutupSemuaModal();
    document.getElementById('hud').classList.add('sembunyi');
    document.getElementById('kontrol-sentuh').classList.add('sembunyi');
    tampilkanRuang('materi');
    this.segarkanRingkasanMenu();
    document.getElementById('layar-menu').classList.remove('sembunyi');
    this.layar = 'menu';
    this.setStatusKursor(true);
  },

  mulaiMain() {
    Suara.siapkan();
    document.getElementById('layar-menu').classList.add('sembunyi');
    document.getElementById('hud').classList.remove('sembunyi');
    if (!MODE_GAME) document.getElementById('kontrol-sentuh').classList.remove('sembunyi');
    this.layar = 'main';

    // Reset kemiringan kamera dari mode orbit menu lalu masuk ke Lobi Utama
    const kamera = document.getElementById('kamera');
    if (kamera && kamera.components['look-controls']) {
      kamera.components['look-controls'].pitchObject.rotation.x = 0;
      kamera.components['look-controls'].yawObject.rotation.y = 0;
    }
    tampilkanRuang('lobi');

    this.perbaruiHUD();
    this.setStatusKursor(false);
    this.tampilKartuRuang('lobi');
  },

  bukaJeda() {
    this.layar = 'jeda';
    tampilAksi(null);
    this.setStatusKursor(true);
    const mat = (PROG.mat || []).length;
    const sim = JENIS_GERBANG.filter((j) => ((PROG.sim || {})[j] || []).length >= (j === 'NOT' ? 2 : 4)).length;
    document.getElementById('daftar-misi-jeda').innerHTML = `
      <div class="item-misi-jeda"><span>1. Galeri Materi (7 Gerbang)</span><strong>${PROG.materi ? '✔ Selesai' : mat + '/7'}</strong></div>
      <div class="item-misi-jeda"><span>2. Lab Saklar (4 Tabel Kebenaran)</span><strong>${PROG.simulator ? '✔ Selesai' : Math.min(sim, 4) + '/4'}</strong></div>
      <div class="item-misi-jeda"><span>3. Arena Uji (Kuis Logika)</span><strong>${PROG.kuis ? '✔ Skor ' + (PROG.skorKuis || 8) + '/8' : 'Belum'}</strong></div>
    `;

    const btnDemo = document.getElementById('btn-demo');
    if (btnDemo) {
      const penuh = semuaTerbuka();
      btnDemo.disabled = penuh;
      btnDemo.textContent = penuh
        ? '✔ Semua Zona & Kristal Sudah Terbuka'
        : 'Mode Demo (Buka Semua Kristal)';
    }

    document.getElementById('layar-jeda').classList.remove('sembunyi');
  },

  bukaModal(idModal, asal) {
    this.layarSebelumnya = asal;
    this.setStatusKursor(true);
    document.getElementById('layar-menu').classList.add('sembunyi');
    document.getElementById('layar-jeda').classList.add('sembunyi');
    document.getElementById(idModal).classList.remove('sembunyi');
  },

  bukaPengaturan(asal) {
    document.getElementById('atur-tema').value = Pengaturan.data.tema;
    document.getElementById('atur-kualitas').value = Pengaturan.data.kualitas;
    document.getElementById('atur-suara').checked = Pengaturan.data.suara;
    document.getElementById('atur-fov').value = Pengaturan.data.fov;
    this.bukaModal('layar-pengaturan', asal);
  },

  kembaliDariModal() {
    document.getElementById('layar-pengaturan').classList.add('sembunyi');
    document.getElementById('layar-panduan').classList.add('sembunyi');
    if (this.layarSebelumnya === 'menu') {
      document.getElementById('layar-menu').classList.remove('sembunyi');
      this.layar = 'menu';
      this.setStatusKursor(true);
    } else {
      this.bukaJeda();
    }
  },

  tutupSemuaModal() {
    ['layar-menu', 'layar-jeda', 'layar-pengaturan', 'layar-panduan', 'layar-konfirmasi', 'panel-inspeksi'].forEach((id) => {
      document.getElementById(id).classList.add('sembunyi');
    });
    this.layar = 'main';
  },

  tampilInspeksi(jenis) {
    const d = DATA_GERBANG[jenis];
    if (!d) return;
    this.layar = 'inspeksi';
    tampilAksi(null);
    this.setStatusKursor(true);

    document.getElementById('insp-judul').textContent = d.nama;
    document.getElementById('insp-boolean').textContent = d.boolean;
    document.getElementById('insp-deskripsi').textContent = d.deskripsi;
    document.getElementById('insp-logisim').textContent = d.logisim;
    document.getElementById('panel-inspeksi').classList.remove('sembunyi');

    const teksBaca = `${d.nama}. Ekspresi boolean: ${d.boolean}. ${d.deskripsi} Pada aplikasi Logisim Evolution, pilih ${d.logisim}.`;
    document.getElementById('btn-narasi').onclick = () => Narasi.bicara(teksBaca);
  },

  tutupInspeksi() {
    Narasi.diam();
    Suara.klik();
    document.getElementById('panel-inspeksi').classList.add('sembunyi');
    this.layar = 'main';
    this.setStatusKursor(false);
  },

  perbaruiHUD() {
    const k = document.getElementById('hud-kristal');
    if (k) k.textContent = `${jmlKristal()}/3`;
    const r = document.getElementById('hud-ruang');
    if (r && RUANG_INFO[ruangAktif]) r.textContent = RUANG_INFO[ruangAktif].nama;
    const tablet = document.getElementById('tablet-3d');
    if (tablet && tablet.components['tablet-praktikum']) {
      tablet.components['tablet-praktikum'].segarkan();
    }
  },

  tampilKartuRuang(id) {
    const info = RUANG_INFO[id];
    const kartu = document.getElementById('kartu-ruang');
    if (!info || !kartu) return;
    document.getElementById('kartu-sub').textContent = info.sub;
    document.getElementById('kartu-judul').textContent = info.nama.toUpperCase();
    kartu.classList.add('tampil');
    clearTimeout(this._kartuT);
    this._kartuT = setTimeout(() => kartu.classList.remove('tampil'), 2400);
  }
};

function tampilAksi(teks) {
  const box = document.getElementById('prompt-aksi');
  const bidik = document.getElementById('bidik');
  if (!box || !bidik) return;
  if (teks && UI.layar === 'main') {
    document.getElementById('teks-aksi').textContent = teks;
    box.classList.add('tampil');
    bidik.classList.add('sorot');
  } else {
    box.classList.remove('tampil');
    bidik.classList.remove('sorot');
  }
}