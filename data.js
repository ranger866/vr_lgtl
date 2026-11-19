/* ==========================================================================
   data.js — DATA MATERI GERBANG LOGIKA, LOGISIM EVOLUTION & KONFIGURASI RUANG
   ========================================================================== */

const MISI = [
  {
    k: 'materi',
    nama: 'Materi',
    sub: 'Galeri Gerbang',
    ruang: 'materi',
    warna: '#38bdf8'
  },
  {
    k: 'simulator',
    nama: 'Simulator',
    sub: 'Lab Saklar',
    ruang: 'simulator',
    warna: '#f59e0b'
  },
  {
    k: 'kuis',
    nama: 'Kuis',
    sub: 'Arena Uji',
    ruang: 'kuis',
    warna: '#2ecc71'
  }
];

const DATA_GERBANG = {
  NOT: {
    nama: 'Gerbang NOT (Inverter)',
    boolean: 'Y = Ā',
    warna: '#f87171',
    deskripsi: 'Membalikkan keadaan logika masukan. Jika input bernilai 0 (LOW), output menjadi 1 (HIGH), dan sebaliknya.',
    logisim: 'Gates → NOT Gate (Atur Facing: East, Data Bits: 1)',
    fn: (a) => +!a
  },
  AND: {
    nama: 'Gerbang AND',
    boolean: 'Y = A · B',
    warna: '#38bdf8',
    deskripsi: 'Menghasilkan output 1 (HIGH) hanya apabila seluruh input bernilai 1. Bekerja seperti dua saklar yang disusun seri.',
    logisim: 'Gates → AND Gate (Number of Inputs: 2)',
    fn: (a, b) => a & b
  },
  OR: {
    nama: 'Gerbang OR',
    boolean: 'Y = A + B',
    warna: '#4ade80',
    deskripsi: 'Menghasilkan output 1 (HIGH) apabila salah satu atau kedua input bernilai 1. Bekerja seperti dua saklar yang disusun paralel.',
    logisim: 'Gates → OR Gate (Number of Inputs: 2)',
    fn: (a, b) => a | b
  },
  NAND: {
    nama: 'Gerbang NAND (Not-AND)',
    boolean: 'Y = (A · B)̅',
    warna: '#c084fc',
    deskripsi: 'Kebalikan dari gerbang AND. Output bernilai 0 hanya jika seluruh input bernilai 1. Merupakan gerbang universal dalam perancangan IC digital.',
    logisim: 'Gates → NAND Gate (Number of Inputs: 2)',
    fn: (a, b) => +!(a & b)
  },
  NOR: {
    nama: 'Gerbang NOR (Not-OR)',
    boolean: 'Y = (A + B)̅',
    warna: '#fb923c',
    deskripsi: 'Kebalikan dari gerbang OR. Output bernilai 1 hanya jika seluruh input bernilai 0. Juga termasuk gerbang universal.',
    logisim: 'Gates → NOR Gate (Number of Inputs: 2)',
    fn: (a, b) => +!(a | b)
  },
  XOR: {
    nama: 'Gerbang XOR (Exclusive-OR)',
    boolean: 'Y = A ⊕ B',
    warna: '#f472b6',
    deskripsi: 'Menghasilkan output 1 apabila kedua input memiliki nilai logika yang berbeda (satu 0 dan satu 1). Digunakan sebagai penjumlah pada rangkaian Half Adder.',
    logisim: 'Gates → XOR Gate (Multiple-Input Behavior: When one input is on)',
    fn: (a, b) => a ^ b
  },
  XNOR: {
    nama: 'Gerbang XNOR (Exclusive-NOR)',
    boolean: 'Y = (A ⊕ B)̅',
    warna: '#22d3ee',
    deskripsi: 'Kebalikan dari XOR. Menghasilkan output 1 apabila kedua input memiliki nilai logika yang sama (keduanya 0 atau keduanya 1). Berfungsi sebagai komparator kesamaan bit.',
    logisim: 'Gates → XNOR Gate (Number of Inputs: 2)',
    fn: (a, b) => +!(a ^ b)
  }
};

const JENIS_GERBANG = Object.keys(DATA_GERBANG);

const RUANG_INFO = {
  lobi: {
    nama: 'Lobi Utama',
    sub: 'PUSAT KENDALI PRAKTIKUM',
    masuk: { x: -3, y: 0, z: 0.5 },
    yaw: 90,
    batas: { x: 7.3, zmin: -5.2, zmax: 7.3 }
  },
  materi: {
    nama: 'Galeri Gerbang',
    sub: 'ZONA 1 · EKSPLORASI KONSEP',
    masuk: { x: 0, y: 0, z: 8.5 },
    yaw: 0,
    batas: { x: 12.2, zmin: -9.8, zmax: 10.2 }
  },
  simulator: {
    nama: 'Lab Saklar',
    sub: 'ZONA 2 · MANIPULASI RANGKAIAN',
    masuk: { x: 0, y: 0, z: 6.5 },
    yaw: 0,
    batas: { x: 10.2, zmin: -0.9, zmax: 8.2 }
  },
  kuis: {
    nama: 'Arena Uji',
    sub: 'ZONA 3 · EVALUASI PEMAHAMAN',
    masuk: { x: 0, y: 0, z: 6.5 },
    yaw: 0,
    batas: { x: 9.2, zmin: -7.5, zmax: 8.2 }
  }
};

const TEMA_LAB = {
  gelap: {
    langit: '#0b111e',
    lantai: '#0f172a',
    dinding: '#1e293b',
    dindingBelakang: '#172033',
    plafon: '#090d16',
    papan: '#090e1a',
    objek: '#1e293b',
    garis: '#1d4ed8',
    strip: '#38bdf8',
    lampu: '#facc15',
    teks: '#f1f5f9',
    amb: 0.85
  },
  terang: {
    langit: '#cbd5e1',
    lantai: '#cbd5e1',
    dinding: '#f1f5f9',
    dindingBelakang: '#e2e8f0',
    plafon: '#ffffff',
    papan: '#0f172a',
    objek: '#94a3b8',
    garis: '#94a3b8',
    strip: '#ffffff',
    lampu: '#f59e0b',
    teks: '#0f172a',
    amb: 0.9
  }
};