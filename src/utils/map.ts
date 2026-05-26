import { Wall, HidingSpot, GameItem, Vector2D, Diary } from '../types';

export const MAP_WIDTH = 1500;
export const MAP_HEIGHT = 1000;

export interface GameMap {
  walls: Wall[];
  hidingSpots: HidingSpot[];
  items: GameItem[];
  playerSpawn: Vector2D;
  enemySpawn: Vector2D;
  enemyPatrolPoints: Vector2D[];
  exitGatePos: Vector2D;
}

export const DIARIES: Diary[] = [
  {
    title: "Catatan Dr. Aris - 12 Maret 1978",
    author: "Dr. Aris (Psikiater Kepala)",
    date: "12 Maret 1978",
    content: "Eksperimen 'Proyek Gelap' semakin di luar kendali. Subjek nomor 7 kembali melolong sepanjang malam. Efek mutagen tidak menenangkan pasien, justru merangsang indra pendengaran mereka secara abnormal. Mereka sekarang buta, namun dapat mendengar derit terkecil dari jarak 20 meter. Jika subjek lepas, matikan semua senter dan TAHAN NAPASMUU..."
  },
  {
    title: "Lembar Sobek Perawat Nina - 4 Mei 1978",
    author: "Nina (Perawat Senior)",
    date: "4 Mei 1978",
    content: "Tuhan Lindungi Kami. Rumah sakit ini dikunci dari luar. Pasien-pasien di bangsal bawah merobek daging mereka sendiri dan sekarang berkeliaran mencari kita. Suara langkah sepatuku membuat mereka murka. Aku harus merangkak (crouch) menyusuri lorong. Aku menyembunyikan kunci merah di Ruang Dokter Utama. Tolong ganti baterai senter sebelum gelap menerkam!"
  },
  {
    title: "Coretan Dinding Kamar Pasien A",
    author: "Pasien Tanpa Nama",
    date: "Ags 1978",
    content: "DIA ada di udara! DIA mendengar detak jantungmu! Ketika dia mendekat, kepalamu akan pusing dan radio/senter akan berderit kencang. Jika kau harus bersembunyi di LOKER logam, kendalikan detak jantungmu, jangan sampai berteriak tersedak (tahan napas dengan menekan SPACEBAR berulang kali secara ritmis)."
  },
  {
    title: "Instruksi Panel Darurat Gerbang Utama",
    author: "Keamanan Rumah Sakit",
    date: "Sistem Manual",
    content: "Gerbang baja utama ditenagai oleh 4 Sekring Daya (Power Fuses) yang tersebar di Laboratorium, Kamar Jenazah, Ruang Terapi, dan Kantor Administrasi. Pasang sekring di panel gerbang selatan. PERINGATAN: Ketika daya menyala, alarm keras akan berbunyi selama 5 detik, menarik semua entitas di sekitar menuju gerbang utama!"
  }
];

export function generateHospitalMap(): GameMap {
  const walls: Wall[] = [];

  // 1. Boundary walls
  walls.push({ x1: 0, y1: 0, x2: MAP_WIDTH, y2: 0 }); // Top boundary
  walls.push({ x1: MAP_WIDTH, y1: 0, x2: MAP_WIDTH, y2: MAP_HEIGHT }); // Right boundary
  walls.push({ x1: MAP_WIDTH, y1: MAP_HEIGHT, x2: 0, y2: MAP_HEIGHT }); // Bottom boundary
  walls.push({ x1: 0, y1: MAP_HEIGHT, x2: 0, y2: 0 }); // Left boundary

  // Helper to add rectangular walls
  const addRoom = (startX: number, startY: number, w: number, h: number, openings: { side: 'top' | 'bottom' | 'left' | 'right', offset: number, size: number }[]) => {
    // Top wall
    let topOpen = openings.find(o => o.side === 'top');
    if (topOpen) {
      walls.push({ x1: startX, y1: startY, x2: startX + topOpen.offset, y2: startY });
      walls.push({ x1: startX + topOpen.offset + topOpen.size, y1: startY, x2: startX + w, y2: startY });
    } else {
      walls.push({ x1: startX, y1: startY, x2: startX + w, y2: startY });
    }

    // Bottom wall
    let bottomOpen = openings.find(o => o.side === 'bottom');
    if (bottomOpen) {
      walls.push({ x1: startX, y1: startY + h, x2: startX + bottomOpen.offset, y2: startY + h });
      walls.push({ x1: startX + bottomOpen.offset + bottomOpen.size, y1: startY + h, x2: startX + w, y2: startY + h });
    } else {
      walls.push({ x1: startX, y1: startY + h, x2: startX + w, y2: startY + h });
    }

    // Left wall
    let leftOpen = openings.find(o => o.side === 'left');
    if (leftOpen) {
      walls.push({ x1: startX, y1: startY, x2: startX, y2: startY + leftOpen.offset });
      walls.push({ x1: startX, y1: startY + leftOpen.offset + leftOpen.size, x2: startX, y2: startY + h });
    } else {
      walls.push({ x1: startX, y1: startY, x2: startX, y2: startY + h });
    }

    // Right wall
    let rightOpen = openings.find(o => o.side === 'right');
    if (rightOpen) {
      walls.push({ x1: startX + w, y1: startY, x2: startX + w, y2: startY + rightOpen.offset });
      walls.push({ x1: startX + w, y1: startY + rightOpen.offset + rightOpen.size, x2: startX + w, y2: startY + h });
    } else {
      walls.push({ x1: startX + w, y1: startY, x2: startX + w, y2: startY + h });
    }
  };

  // ROOM 1: Patient Ward A (Top-Left)
  // Coordinates: x: 50, y: 50, width: 350, height: 260
  addRoom(50, 50, 350, 260, [
    { side: 'bottom', offset: 150, size: 70 } // Doorway facing central corridor
  ]);

  // ROOM 2: Nurse Station & Admin Office (Top-Center)
  // Coordinates: x: 550, y: 50, width: 400, height: 200
  addRoom(550, 50, 400, 200, [
    { side: 'bottom', offset: 170, size: 80 }
  ]);

  // ROOM 3: Operating Theater / Morgue (Top-Right)
  // Coordinates: x: 1100, y: 50, width: 350, height: 320
  addRoom(1100, 50, 350, 320, [
    { side: 'left', offset: 120, size: 80 }
  ]);

  // ROOM 4: Intensive Care Unit (ICU) (Bottom-Left)
  // Coordinates: x: 50, y: 650, width: 400, height: 300
  addRoom(50, 650, 400, 300, [
    { side: 'right', offset: 80, size: 80 }
  ]);

  // ROOM 5: Lab & Research (Bottom-Right)
  // Coordinates: x: 1050, y: 650, width: 400, height: 300
  addRoom(1050, 650, 400, 300, [
    { side: 'left', offset: 100, size: 80 }
  ]);

  // Add some internal columns or maze-like walls in the corridors to provide stealth cover
  // Horizontal cover walls
  walls.push({ x1: 500, y1: 450, x2: 700, y2: 450 });
  walls.push({ x1: 850, y1: 450, x2: 1050, y2: 450 });

  // Columns / Small obstacles (formed by 4 wall segments)
  const addColumn = (cx: number, cy: number, size: number) => {
    walls.push({ x1: cx - size, y1: cy - size, x2: cx + size, y2: cy - size });
    walls.push({ x1: cx + size, y1: cy - size, x2: cx + size, y2: cy + size });
    walls.push({ x1: cx + size, y1: cy + size, x2: cx - size, y2: cy + size });
    walls.push({ x1: cx - size, y1: cy + size, x2: cx - size, y2: cy - size });
  };

  addColumn(450, 550, 25);
  addColumn(1050, 500, 25);
  addColumn(750, 750, 30);
  addColumn(150, 450, 20);

  // Divider walls in corridors
  walls.push({ x1: 450, y1: 250, x2: 450, y2: 380 });
  walls.push({ x1: 1050, y1: 250, x2: 1050, y2: 380 });

  // 2. Hiding Spots (Lockers/Beds)
  // Hiding spots represent lockers where the player can press 'E' to hide.
  const hidingSpots: HidingSpot[] = [
    { id: 'locker_ward', x: 80, y: 60, width: 45, height: 40, type: 'locker' },
    { id: 'locker_nurse', x: 600, y: 60, width: 45, height: 40, type: 'locker' },
    { id: 'locker_morgue', x: 1380, y: 150, width: 40, height: 45, type: 'locker' },
    { id: 'locker_icu_1', x: 80, y: 900, width: 45, height: 40, type: 'locker' },
    { id: 'bed_lab_1', x: 1200, y: 700, width: 50, height: 80, type: 'bed' },
    { id: 'locker_corridor', x: 750, y: 480, width: 45, height: 40, type: 'locker' },
  ];

  // 3. Items scattered
  // Needs 4 Fuses to activate fusebox and escape.
  // 1 Gate Key, batteries, diaries.
  const items: GameItem[] = [
    // Fuses (Goal items)
    { id: 'fuse_1', x: 200, y: 150, type: 'fuse', collected: false }, // Patient Ward A (Red Key room)
    { id: 'fuse_2', x: 1250, y: 120, type: 'fuse', collected: false }, // Operating Room/Morgue
    { id: 'fuse_3', x: 150, y: 750, type: 'fuse', collected: false }, // ICU (Bottom-Left)
    { id: 'fuse_4', x: 1300, y: 880, type: 'fuse', collected: false }, // Lab/Research (Bottom-Right)

    // Keys
    { id: 'key_red', x: 750, y: 120, type: 'key', collected: false, keyColor: 'red' }, // In Nurse Station
    { id: 'key_blue', x: 1380, y: 280, type: 'key', collected: false, keyColor: 'blue' }, // In Morgue

    // Batteries for Flashlight
    { id: 'battery_1', x: 480, y: 410, type: 'battery', collected: false },
    { id: 'battery_2', x: 1150, y: 750, type: 'battery', collected: false },
    { id: 'battery_3', x: 700, y: 920, type: 'battery', collected: false },
    { id: 'battery_4', x: 100, y: 400, type: 'battery', collected: false },

    // Diary Logs
    { id: 'diary_0', x: 250, y: 80, type: 'diary', collected: false, diaryIndex: 0 },
    { id: 'diary_1', x: 620, y: 120, type: 'diary', collected: false, diaryIndex: 1 },
    { id: 'diary_2', x: 1200, y: 200, type: 'diary', collected: false, diaryIndex: 2 },
    { id: 'diary_3', x: 750, y: 880, type: 'diary', collected: false, diaryIndex: 3 },
  ];

  // Locked doors represented as wall segments. We will draw them specially and unlock them if user clicks/collides with them while carrying keys.
  // Door to Patient Ward A (Requires Red Key) - coordinates fit bottom doorway of Ward A
  // Room A was 50, 50, 350, 260 with doorway at bottom offset 150 size 70.
  // Bottom wall at y=310, doorway x1 = 50+150=200, x2 = 200+70=270.
  walls.push({ x1: 200, y1: 310, x2: 270, y2: 310, isOpenDoor: false }); // Locked door! (we can identify locked doors as segment markers)

  // Door to Admin/Lab: y=650 doorway left offset 100 size 80
  // startX: 1050, startY: 650. Left wall is at x=1050. doorway y1 = 650+100=750, y2 = 750+80=830.
  walls.push({ x1: 1050, y1: 750, x2: 1050, y2: 830, isOpenDoor: false }); // Blue Locked Door

  // Spawn positions
  // Player spawns at central corridor
  const playerSpawn: Vector2D = { x: 750, y: 550 };

  // Enemy spawns on the far end
  const enemySpawn: Vector2D = { x: 1250, y: 150 };

  // Stalker patrol waypoints (creepy path circulating the hospital)
  const enemyPatrolPoints: Vector2D[] = [
    { x: 1250, y: 150 }, // Morgue
    { x: 1000, y: 420 }, // Central corridor right
    { x: 1250, y: 780 }, // Lab Corner
    { x: 750, y: 800 }, // Southern passage
    { x: 250, y: 800 }, // ICU Entrance
    { x: 250, y: 450 }, // Left corridor
    { x: 500, y: 350 }, // Central passage top-left
    { x: 750, y: 350 }, // Central corridor top
  ];

  // Exit Fuser Panel and Gate is located at the absolute bottom-center
  // Main gate at y=1000, between x=700 & 800.
  const exitGatePos: Vector2D = { x: 750, y: 990 };

  return {
    walls,
    hidingSpots,
    items,
    playerSpawn,
    enemySpawn,
    enemyPatrolPoints,
    exitGatePos,
  };
}
