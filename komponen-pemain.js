/* ==========================================================================
   komponen-pemain.js — GERAK FIRST-PERSON NORMAL & PENJAGA BATAS DINDING
   ========================================================================== */

const PENGHALANG_RUANG = {
  lobi: {
    batas: { x: 7.3, zmin: -5.2, zmax: 7.2 },
    bulat: [
      // Alas kristal di dekat dinding belakang (z = 6.7)
      { x: -1.45, z: 6.7, r: 0.72 },
      { x: 0, z: 6.7, r: 0.72 },
      { x: 1.45, z: 6.7, r: 0.72 }
    ],
    kotak: []
  },
  materi: {
    batas: { x: 12.1, zmin: -10.1, zmax: 10.1 },
    bulat: [
      { x: 0, z: 1, r: 2.75 },
      ...Array.from({ length: 7 }, (_, i) => {
        const th = ((-69 + i * 23) * Math.PI) / 180;
        return { x: 8 * Math.sin(th), z: -1.5 - 8 * Math.cos(th), r: 1.15 };
      })
    ],
    kotak: []
  },
  simulator: {
    batas: { x: 10.1, zmin: -8.1, zmax: 8.1 },
    bulat: [],
    kotak: [
      // Meja konsol pemilih gerbang di dinding kanan
      { x1: 8.0, x2: 10.5, z1: -5.6, z2: 5.6 }
    ]
  },
  kuis: {
    batas: { x: 9.1, zmin: -8.1, zmax: 8.1 },
    bulat: [
      { x: 0, z: -2.2, r: 1.0 }
    ],
    kotak: []
  }
};

AFRAME.registerComponent('pemain-gerak', {
  init() {
    this.tombol = {};
    this.stik = { x: 0, z: 0 };
    this.ruang = 'lobi';
    this.kamera = document.getElementById('kamera');
    this.arahDepan = new THREE.Vector3();
    this.arahKanan = new THREE.Vector3();
    this.sumbuY = new THREE.Vector3(0, 1, 0);

    window.addEventListener('keydown', (e) => { this.tombol[e.code] = true; });
    window.addEventListener('keyup', (e) => { this.tombol[e.code] = false; });

    const zona = document.getElementById('zona-stik');
    const knop = document.getElementById('knop-stik');
    if (zona && knop) {
      zona.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = zona.getBoundingClientRect();
        const t = e.touches[0];
        const dx = Math.max(-36, Math.min(36, t.clientX - (rect.left + rect.width / 2)));
        const dy = Math.max(-36, Math.min(36, t.clientY - (rect.top + rect.height / 2)));
        knop.style.transform = `translate(${dx}px, ${dy}px)`;
        this.stik.x = dx / 36;
        this.stik.z = dy / 36;
      }, { passive: false });

      zona.addEventListener('touchend', () => {
        knop.style.transform = 'translate(0px, 0px)';
        this.stik.x = 0;
        this.stik.z = 0;
      });
    }
  },

  aturArah(derajat) {
    if (this.kamera && this.kamera.components['look-controls']) {
      const lc = this.kamera.components['look-controls'];
      lc.pitchObject.rotation.x = 0;
      lc.yawObject.rotation.y = THREE.MathUtils.degToRad(derajat);
    }
  },

  aturRuang(id) {
    this.ruang = id;
  },

  kunciDalamRuang() {
    const cfg = PENGHALANG_RUANG[this.ruang] || PENGHALANG_RUANG.lobi;
    const b = cfg.batas;
    const p = this.el.object3D.position;

    // 1. Kunci mutlak di dalam dinding ruangan
    p.x = Math.max(-b.x, Math.min(b.x, p.x));
    p.z = Math.max(b.zmin, Math.min(b.zmax, p.z));
    p.y = 0;

    // 2. Tolak keluar jika menyentuh penghalang lingkaran
    for (const c of cfg.bulat) {
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const jarak = Math.hypot(dx, dz);
      if (jarak < c.r && jarak > 0.0001) {
        p.x = c.x + (dx / jarak) * c.r;
        p.z = c.z + (dz / jarak) * c.r;
      }
    }

    // 3. Tolak keluar jika menyentuh penghalang kotak
    for (const k of cfg.kotak) {
      if (p.x > k.x1 && p.x < k.x2 && p.z > k.z1 && p.z < k.z2) {
        const dKiri = Math.abs(p.x - k.x1);
        const dKanan = Math.abs(k.x2 - p.x);
        const dAtas = Math.abs(p.z - k.z1);
        const dBawah = Math.abs(k.z2 - p.z);
        const min = Math.min(dKiri, dKanan, dAtas, dBawah);
        if (min === dKiri) p.x = k.x1;
        else if (min === dKanan) p.x = k.x2;
        else if (min === dAtas) p.z = k.z1;
        else p.z = k.z2;
      }
    }
  },

  tick(waktu, delta) {
    if (!delta) return;
    const dt = Math.min(delta, 100) / 1000;

    if (UI.layar !== 'main') {
      this.kunciDalamRuang();
      return;
    }

    // majuPositif = +1 saat tekan W / Panah Atas, -1 saat tekan S / Panah Bawah
    let majuPositif = -this.stik.z;
    let kananPositif = this.stik.x;
    if (this.tombol['KeyW'] || this.tombol['ArrowUp']) majuPositif += 1;
    if (this.tombol['KeyS'] || this.tombol['ArrowDown']) majuPositif -= 1;
    if (this.tombol['KeyD'] || this.tombol['ArrowRight']) kananPositif += 1;
    if (this.tombol['KeyA'] || this.tombol['ArrowLeft']) kananPositif -= 1;

    if (majuPositif !== 0 || kananPositif !== 0) {
      const mag = Math.hypot(majuPositif, kananPositif);
      majuPositif /= mag;
      kananPositif /= mag;

      // Vektor pandang depan kamera (arah -Z lokal kamera pada bidang XZ)
      this.arahDepan.set(0, 0, -1).applyQuaternion(this.kamera.object3D.getWorldQuaternion(new THREE.Quaternion()));
      this.arahDepan.y = 0;
      if (this.arahDepan.lengthSq() > 0.0001) {
        this.arahDepan.normalize();
      } else {
        this.arahDepan.set(0, 0, -1);
      }

      // Vektor ke kanan dari arah pandang (depan × atas)
      this.arahKanan.crossVectors(this.arahDepan, this.sumbuY).normalize();

      const kecepatan = 5.2 * dt;
      const p = this.el.object3D.position;
      p.addScaledVector(this.arahDepan, majuPositif * kecepatan);
      p.addScaledVector(this.arahKanan, kananPositif * kecepatan);
    }

    this.kunciDalamRuang();
  },

  tock() {
    this.kunciDalamRuang();
  }
});

AFRAME.registerComponent('hadap-pemain', {
  init() {
    this.posPemain = new THREE.Vector3();
    this.posObjek = new THREE.Vector3();
  },
  tick() {
    const cam = this.el.sceneEl.camera;
    if (!cam) return;
    cam.getWorldPosition(this.posPemain);
    this.el.object3D.getWorldPosition(this.posObjek);
    this.el.object3D.rotation.y = Math.atan2(
      this.posPemain.x - this.posObjek.x,
      this.posPemain.z - this.posObjek.z
    );
  }
});