import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Power, Zap, BookOpen, KeyRound, ShieldAlert, ArrowUpRight, Play, Eye, EyeOff } from 'lucide-react';
import { Player, Enemy, Wall, GameItem, HidingSpot, GamePhase, Vector2D } from '../types';
import { generateHospitalMap, MAP_WIDTH, MAP_HEIGHT, DIARIES } from '../utils/map';
import { calculateVisibility, distance, isPointVisible } from '../utils/raycast';
import { soundManager } from '../utils/audio';
import FearIndicator from './FearIndicator';
import HidingGame from './HidingGame';
import DiaryModal from './DiaryModal';

interface GameCanvasProps {
  phase: GamePhase;
  setPhase: (phase: GamePhase) => void;
  onExitToMenu: () => void;
}

export default function GameCanvas({ phase, setPhase, onExitToMenu }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load Map Layout
  const [mapData, setMapData] = useState(() => generateHospitalMap());
  const [player, setPlayer] = useState<Player>({
    x: 750,
    y: 550,
    angle: 0,
    speed: 1.8,
    radius: 14,
    flashlightOn: false,
    flashlightBattery: 100,
    movementMode: 'walk',
    noiseLevel: 0,
    panicLevel: 0,
    isHiding: false,
    currentHidingSpotId: null,
    breathRemaining: 100,
  });

  const [enemy, setEnemy] = useState<Enemy>({
    x: 1250,
    y: 150,
    angle: Math.PI,
    radius: 16,
    speed: 1.0,
    state: 'patrol',
    patrolPath: [],
    currentPathIndex: 0,
    lastKnownPlayerPos: null,
    alertLevel: 0,
    searchTimer: 0,
    pulseTime: 0,
  });

  // UI States
  const [keysHeld, setKeysHeld] = useState<{ [key: string]: boolean }>({});
  const [mousePos, setMousePos] = useState<Vector2D>({ x: 0, y: 0 });
  const [fusesInserted, setFusesInserted] = useState<number>(0);
  const [redKeyCollected, setRedKeyCollected] = useState(false);
  const [blueKeyCollected, setBlueKeyCollected] = useState(false);
  const [fusesCount, setFusesCount] = useState(0);
  const [activeDiary, setActiveDiary] = useState<number | null>(null);
  const [actionPrompt, setActionPrompt] = useState<string | null>(null);
  const [strobeScreen, setStrobeScreen] = useState(false); // for jumpscare visual flash
  const [particles, setParticles] = useState<any[]>([]); // floaty dust particles

  // Refs for current mutable values to use in game loop without re-triggering effect
  const playerRef = useRef<Player>(player);
  const enemyRef = useRef<Enemy>(enemy);
  const keysHeldRef = useRef(keysHeld);
  const mousePosRef = useRef<Vector2D>(mousePos);
  const itemsRef = useRef<GameItem[]>(mapData.items);
  const wallsRef = useRef<Wall[]>(mapData.walls);
  const hidingSpotsRef = useRef<HidingSpot[]>(mapData.hidingSpots);
  const fusesInsertedRef = useRef(fusesInserted);

  // Sync refs
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { enemyRef.current = enemy; }, [enemy]);
  useEffect(() => { keysHeldRef.current = keysHeld; }, [keysHeld]);
  useEffect(() => { mousePosRef.current = mousePos; }, [mousePos]);
  useEffect(() => { itemsRef.current = mapData.items; }, [mapData.items]);
  useEffect(() => { wallsRef.current = mapData.walls; }, [mapData.walls]);
  useEffect(() => { fusesInsertedRef.current = fusesInserted; }, [fusesInserted]);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      setKeysHeld((prev) => ({ ...prev, [code]: true }));

      // Quick hotkeys
      if (e.key === 'f' || e.key === 'F') {
        toggleFlashlight();
      }

      // Hide / Interact key
      if (e.key === 'e' || e.key === 'E') {
        handleInteraction();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      setKeysHeld((prev) => ({ ...prev, [code]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mapData]);

  // Flashlight toggle
  const toggleFlashlight = () => {
    const p = playerRef.current;
    if (p.isHiding) return;
    if (p.flashlightBattery <= 0 && !p.flashlightOn) return;

    soundManager.playFlashlightClick();
    setPlayer((prev) => ({
      ...prev,
      flashlightOn: !prev.flashlightOn,
    }));
  };

  // Interaction (E Key) solver
  const handleInteraction = () => {
    const p = playerRef.current;
    const items = itemsRef.current;
    const spots = hidingSpotsRef.current;

    // 1. If currently hiding inside locker, E exits locker
    if (p.isHiding) {
      exitLocker();
      return;
    }

    // 2. Try entering looker
    const nearbyLocker = spots.find(
      (s) => distance({ x: s.x + s.width / 2, y: s.y + s.height / 2 }, { x: p.x, y: p.y }) < 45
    );
    if (nearbyLocker) {
      enterLocker(nearbyLocker.id);
      return;
    }

    // 3. Try picking up items
    const nearbyItem = items.find((i) => !i.collected && distance({ x: i.x, y: i.y }, { x: p.x, y: p.y }) < 35);
    if (nearbyItem) {
      collectItem(nearbyItem.id);
      return;
    }

    // 4. Try putting Fuses into Control Panel (located near Exit Gate center bottom)
    const gateDist = distance({ x: p.x, y: p.y }, mapData.exitGatePos);
    if (gateDist < 60) {
      if (fusesCount > 0) {
        soundManager.playPickupSound();
        setFusesInserted((prev) => prev + fusesCount);
        setFusesCount(0);
      }
    }

    // 5. Try opening Locked doors
    // Check if player stands close to a locked door segment
    let playedUnlocking = false;
    mapData.walls.forEach((wall) => {
      if (wall.isOpenDoor === false) {
        // mid point
        const mx = (wall.x1 + wall.x2) / 2;
        const my = (wall.y1 + wall.y2) / 2;
        const wallDist = distance({ x: mx, y: my }, { x: p.x, y: p.y });
        
        if (wallDist < 50) {
          // Check if Red Key triggers door above Red Room x=200..270 y=310
          if (wall.y1 === 310 && wall.y2 === 310) {
            if (redKeyCollected) {
              wall.isOpenDoor = true; // Unlock!
              soundManager.playLockerHidingDoor(true);
              setStrobeScreen(true);
              setTimeout(() => setStrobeScreen(false), 80);
              playedUnlocking = true;
            }
          }
          // Check if Blue Key triggers bottom Lab Door x=1050 y=750..830
          if (wall.x1 === 1050 && wall.x2 === 1050) {
            if (blueKeyCollected) {
              wall.isOpenDoor = true; // Unlock!
              soundManager.playLockerHidingDoor(true);
              setStrobeScreen(true);
              setTimeout(() => setStrobeScreen(false), 80);
              playedUnlocking = true;
            }
          }
        }
      }
    });

    if (playedUnlocking) {
      setMapData((prev) => ({
        ...prev,
        walls: [...prev.walls],
      }));
    }
  };

  const enterLocker = (lockerId: string) => {
    soundManager.playLockerHidingDoor(false);
    setPlayer((prev) => ({
      ...prev,
      isHiding: true,
      flashlightOn: false, // forces silent flashlight
      currentHidingSpotId: lockerId,
    }));
  };

  const exitLocker = () => {
    soundManager.playLockerHidingDoor(true);
    setPlayer((prev) => ({
      ...prev,
      isHiding: false,
      currentHidingSpotId: null,
    }));
  };

  const collectItem = (itemId: string) => {
    soundManager.playPickupSound();

    const items = [...mapData.items];
    const target = items.find((i) => i.id === itemId);
    if (!target) return;

    target.collected = true;

    if (target.type === 'fuse') {
      setFusesCount((prev) => prev + 1);
    } else if (target.type === 'battery') {
      setPlayer((prev) => ({
        ...prev,
        flashlightBattery: Math.min(100, prev.flashlightBattery + 40),
      }));
    } else if (target.type === 'key' && target.keyColor === 'red') {
      setRedKeyCollected(true);
    } else if (target.type === 'key' && target.keyColor === 'blue') {
      setBlueKeyCollected(true);
    } else if (target.type === 'diary' && target.diaryIndex !== undefined) {
      setActiveDiary(target.diaryIndex);
    }

    setMapData((prev) => ({
      ...prev,
      items: items,
    }));
  };

  // Initialize Dust particles
  useEffect(() => {
    const list = [];
    for (let i = 0; i < 75; i++) {
      list.push({
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        speedX: (Math.random() - 0.5) * 0.15,
        speedY: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }
    setParticles(list);

    // Audio triggers
    soundManager.startAmbientDrone();
    soundManager.startHeartbeat();

    return () => {
      soundManager.stopAmbientDrone();
      soundManager.stopHeartbeat();
    };
  }, []);

  // Primary Game Tick Game Loop
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const gameLoop = (timeNow: number) => {
      const delta = (timeNow - lastTime) / 1000;
      lastTime = timeNow;

      if (phase === 'playing') {
        updatePlayerInput(delta);
        updateStalkerAI(delta);
        updateEnvironment(delta);
        drawGame();
      }

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationId);
  }, [phase, mapData, fusesInserted, redKeyCollected, blueKeyCollected, fusesCount]);

  // Capture Mouse position on Canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Scale viewport because of zoom/camera tracking
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Viewport relative coordinates
    const p = playerRef.current;
    const cx = p.x - canvas.width / 2;
    const cy = p.y - canvas.height / 2;
    const mapCamX = Math.max(0, Math.min(MAP_WIDTH - canvas.width, cx));
    const mapCamY = Math.max(0, Math.min(MAP_HEIGHT - canvas.height, cy));

    setMousePos({
      x: mouseX + mapCamX,
      y: mouseY + mapCamY,
    });
  };

  // Solve player movement physics with collisions against wall segments
  const updatePlayerInput = (delta: number) => {
    const keys = keysHeldRef.current;
    const mouse = mousePosRef.current;
    let p = { ...playerRef.current };

    if (p.isHiding) {
      // Hiding sets noise to zero and battery decay is suspended
      p.noiseLevel = 0;
      setPlayer(p);
      return;
    }

    // 1. Calculate direction angle based on Mouse
    p.angle = Math.atan2(mouse.y - p.y, mouse.x - p.x);

    // 2. Set Speed according to keys and mode
    let moveSpeed = 100; // Base speed
    p.movementMode = 'walk';

    if (keys['ShiftLeft'] || keys['ShiftRight']) {
      p.movementMode = 'run';
      moveSpeed = 185;
    } else if (keys['ControlLeft'] || keys['KeyC']) {
      p.movementMode = 'crouch';
      moveSpeed = 50;
    }

    let inputX = 0;
    let inputY = 0;

    if (keys['KeyW'] || keys['ArrowUp']) inputY -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) inputY += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) inputX -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) inputX += 1;

    // Normalize diagonal speeds
    if (inputX !== 0 && inputY !== 0) {
      const scale = 0.7071;
      inputX *= scale;
      inputY *= scale;
    }

    let targetX = p.x + inputX * moveSpeed * delta;
    let targetY = p.y + inputY * moveSpeed * delta;

    // 3. Wall Segment Collision Solver
    // Resolves circular overlaps so the player slides along walls smoothly
    const walls = wallsRef.current;
    const r = p.radius;

    for (const wall of walls) {
      // Skip disabled doors
      if (wall.isOpenDoor === true) continue;

      const sx = wall.x1;
      const sy = wall.y1;
      const ex = wall.x2;
      const ey = wall.y2;

      // Project target point on segment
      const dx = ex - sx;
      const dy = ey - sy;
      const segmentLenSq = dx * dx + dy * dy;
      if (segmentLenSq < 1e-6) continue;

      let t = ((targetX - sx) * dx + (targetY - sy) * dy) / segmentLenSq;
      t = Math.max(0, Math.min(1, t));

      const closestX = sx + t * dx;
      const closestY = sy + t * dy;

      const distSq = (targetX - closestX) ** 2 + (targetY - closestY) ** 2;
      if (distSq < r * r) {
        // Push target position away by overlap
        const dist = Math.sqrt(distSq);
        const overlap = r - dist;
        const pushX = dist > 1e-3 ? (targetX - closestX) / dist : 0;
        const pushY = dist > 1e-3 ? (targetY - closestY) / dist : 1;

        targetX += pushX * overlap;
        targetY += pushY * overlap;
      }
    }

    // Keep within Map absolute borders
    p.x = Math.max(r, Math.min(MAP_WIDTH - r, targetX));
    p.y = Math.max(r, Math.min(MAP_HEIGHT - r, targetY));

    // 4. Update Noise emission level depending on speed
    if (inputX === 0 && inputY === 0) {
      p.noiseLevel = 0;
    } else {
      p.noiseLevel = p.movementMode === 'run' ? 320 : p.movementMode === 'walk' ? 95 : 15;
    }

    // 5. Battery consumption
    if (p.flashlightOn) {
      p.flashlightBattery = Math.max(0, p.flashlightBattery - 2.8 * delta);
      if (p.flashlightBattery <= 0) {
        p.flashlightOn = false;
        soundManager.playFlashlightClick();
      }
    }

    setPlayer(p);
  };

  // State machine AI for "Sang Pengintai" (The Stalker)
  const updateStalkerAI = (delta: number) => {
    let e = { ...enemyRef.current };
    const p = playerRef.current;
    const walls = wallsRef.current;

    e.pulseTime += delta * 4;

    // Distance computation
    const dToPlayer = distance({ x: e.x, y: e.y }, { x: p.x, y: p.y });

    // Is player visible by enemy's flashlights/LoS cones?
    // Stalker vision radius: 360, field of view: 70 degrees
    const playerInLoS =
      !p.isHiding &&
      isPointVisible(
        { x: e.x, y: e.y },
        { x: p.x, y: p.y },
        walls,
        340,
        e.angle,
        Math.PI * 0.45 // roughly 80 degrees tracking cone
      );

    // Is Stalker tracking player's flashlight beams?
    // If player flashlight is on and pointing near Stalker and player has line of sight
    const playerFlashlightAlerts =
      p.flashlightOn &&
      !p.isHiding &&
      isPointVisible(
        { x: p.x, y: p.y },
        { x: e.x, y: e.y },
        walls,
        500,
        p.angle,
        Math.PI * 0.35
      );

    // AI Decision transitions
    if (playerInLoS) {
      // Sighted! Target player directly
      if (e.state !== 'chase') {
        e.state = 'chase';
        e.alertLevel = 100;
        soundManager.playJumpscare(); // SCREAMER Audio!
        setStrobeScreen(true);
        setTimeout(() => setStrobeScreen(false), 200);
      }
      e.lastKnownPlayerPos = { x: p.x, y: p.y };
      e.searchTimer = 0;
    } else if (playerFlashlightAlerts && e.state === 'patrol') {
      // Spots light source, goes to investigate player's origin
      e.state = 'investigate';
      e.lastKnownPlayerPos = { x: p.x, y: p.y };
      e.alertLevel = Math.max(e.alertLevel, 50);
    } else if (!p.isHiding && dToPlayer < p.noiseLevel) {
      // Hears player's running noise!
      e.state = 'investigate';
      e.lastKnownPlayerPos = { x: p.x, y: p.y };
      e.alertLevel = Math.max(e.alertLevel, 40);
    }

    // AI MOVEMENT LOGIC OVER STATE MACHINE
    if (e.state === 'chase') {
      e.speed = 2.1; // Fast chase speed!
      if (e.lastKnownPlayerPos) {
        // Run towards last known positions
        const angle = Math.atan2(e.lastKnownPlayerPos.y - e.y, e.lastKnownPlayerPos.x - e.x);
        e.angle = angle;
        e.x += Math.cos(angle) * e.speed * 100 * delta;
        e.y += Math.sin(angle) * e.speed * 100 * delta;

        // Reach last known pos without finding player? Transitions back to Search
        if (distance({ x: e.x, y: e.y }, e.lastKnownPlayerPos) < 25) {
          e.state = 'search';
          e.searchTimer = 4.0; // search 4 seconds
          e.lastKnownPlayerPos = null;
        }
      } else {
        e.state = 'search';
      }
    } else if (e.state === 'investigate') {
      e.speed = 1.3;
      if (e.lastKnownPlayerPos) {
        const angle = Math.atan2(e.lastKnownPlayerPos.y - e.y, e.lastKnownPlayerPos.x - e.x);
        e.angle = angle;
        e.x += Math.cos(angle) * e.speed * 100 * delta;
        e.y += Math.sin(angle) * e.speed * 100 * delta;

        if (distance({ x: e.x, y: e.y }, e.lastKnownPlayerPos) < 25) {
          e.state = 'search';
          e.searchTimer = 3.0; // search 3 seconds
          e.lastKnownPlayerPos = null;
        }
      } else {
        e.state = 'patrol';
      }
    } else if (e.state === 'search') {
      e.speed = 0.6;
      e.searchTimer -= delta;
      
      // Look around (weave angle direction slowly)
      e.angle += Math.sin(e.pulseTime) * 0.05;

      if (e.searchTimer <= 0) {
        e.state = 'patrol';
        e.alertLevel = 0;
      }
    } else {
      // Default: PATROL
      e.speed = 0.8;
      e.alertLevel = 0;
      
      const targetPoint = mapData.enemyPatrolPoints[e.currentPathIndex];
      const angle = Math.atan2(targetPoint.y - e.y, targetPoint.x - e.x);
      e.angle = angle;
      e.x += Math.cos(angle) * e.speed * 100 * delta;
      e.y += Math.sin(angle) * e.speed * 100 * delta;

      if (distance({ x: e.x, y: e.y }, targetPoint) < 20) {
        // Next checkpoint
        e.currentPathIndex = (e.currentPathIndex + 1) % mapData.enemyPatrolPoints.length;
      }
    }

    // Safety checks: collision push for Stalker against walls
    for (const wall of walls) {
      if (wall.isOpenDoor === true) continue;
      const sx = wall.x1;
      const sy = wall.y1;
      const ex = wall.x2;
      const ey = wall.y2;

      // Project
      const dx = ex - sx;
      const dy = ey - sy;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1e-6) continue;

      let t = ((e.x - sx) * dx + (e.y - sy) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const closestX = sx + t * dx;
      const closestY = sy + t * dy;

      const dSq = (e.x - closestX) ** 2 + (e.y - closestY) ** 2;
      if (dSq < e.radius * e.radius) {
        const dist = Math.sqrt(dSq);
        const overlap = e.radius - dist;
        const pushX = dist > 1e-3 ? (e.x - closestX) / dist : 0;
        const pushY = dist > 1e-3 ? (e.y - closestY) / dist : 1;
        e.x += pushX * overlap;
        e.y += pushY * overlap;
      }
    }

    // Catch condition check
    if (!p.isHiding && dToPlayer < p.radius + e.radius) {
      // Caught!
      soundManager.playJumpscare();
      setPhase('gameover');
    }

    setEnemy(e);
  };

  // Adjust environmental audios and triggers
  const updateEnvironment = (delta: number) => {
    const p = playerRef.current;
    const e = enemyRef.current;
    const items = itemsRef.current;

    const dToStalker = distance({ x: p.x, y: p.y }, { x: e.x, y: e.y });

    // 1. Calculate dynamic player fear / panic level
    let panicValue = 0;
    if (dToStalker < 400 && !p.isHiding) {
      // scales panic based on proximity
      panicValue += (1 - dToStalker / 400) * 80;
    }
    if (e.state === 'chase' && !p.isHiding) {
      panicValue += 20;
    }
    setPlayer((prev) => ({
      ...prev,
      panicLevel: Math.max(0, Math.min(100, panicValue)),
    }));

    // 2. Adjust Heartbeats & EMI static based on stalker distance
    const distLogRatio = Math.max(0, 1 - dToStalker / 650); // 0 at far, 1 when overlapping
    const targetBPM = 60 + distLogRatio * 90;
    soundManager.updateHeartbeatRate(targetBPM);
    soundManager.updateStaticProximity(distLogRatio);

    // 3. Float floating dust particles
    setParticles((prevList) =>
      prevList.map((part) => {
        let nx = part.x + part.speedX;
        let ny = part.y + part.speedY;

        // Wrap boundaries
        if (nx < 0) nx = MAP_WIDTH;
        if (nx > MAP_WIDTH) nx = 0;
        if (ny < 0) ny = MAP_HEIGHT;
        if (ny > MAP_HEIGHT) ny = 0;

        return { ...part, x: nx, y: ny };
      })
    );

    // 4. Update dynamic Interaction Prompts on UI
    let prompt: string | null = null;
    const spots = hidingSpotsRef.current;
    const nearbyLocker = spots.find(
      (s) => distance({ x: s.x + s.width / 2, y: s.y + s.height / 2 }, { x: p.x, y: p.y }) < 45
    );

    if (p.isHiding) {
      prompt = "Tekan E untuk keluar";
    } else if (nearbyLocker) {
      prompt = "Tekan E untuk BERSEMBUNYI";
    } else {
      const nearbyItem = items.find((i) => !i.collected && distance({ x: i.x, y: i.y }, { x: p.x, y: p.y }) < 35);
      if (nearbyItem) {
        if (nearbyItem.type === 'fuse') {
          prompt = "Tekan E untuk ambil SEKRING DARURAT";
        } else if (nearbyItem.type === 'battery') {
          prompt = "Tekan E untuk ambil BATERAI SENTER";
        } else if (nearbyItem.type === 'key') {
          prompt = `Tekan E untuk ambil KUNCI ${nearbyItem.keyColor === 'red' ? 'MERAH' : 'BIRU'}`;
        } else if (nearbyItem.type === 'diary') {
          prompt = "Tekan E untuk membaca DOKUMEN TINGGALAN";
        }
      } else {
        // Near exit gate?
        const gateDist = distance({ x: p.x, y: p.y }, mapData.exitGatePos);
        if (gateDist < 60) {
          if (fusesInsertedRef.current >= 4) {
            prompt = "PROSES DAYA NYALA - LARI KELUAR GERBANG UTAMA!";
          } else if (fusesCount > 0) {
            prompt = `Tekan E untuk memasang ${fusesCount} Sekring`;
          } else {
            prompt = `KOTAK SEKRENG GERBANG (${fusesInsertedRef.current}/4 terpasang). Butuh sekring!`;
          }
        }
      }
    }

    // WIN CONDITION check
    // If fuses are 4 and player passes the southern boundary exit range:
    if (fusesInsertedRef.current >= 4 && p.y > MAP_HEIGHT - 35 && p.x > 700 && p.x < 800) {
      soundManager.playPickupSound();
      setPhase('gamewon');
    }

    setActionPrompt(prompt);
  };

  // Render everything onto 2D Canvas!
  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const timeNow = performance.now();
    if (!ctx) return;

    // Fluid responsive Canvas dimension sync
    const container = canvas.parentElement;
    if (container) {
      if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    }

    const p = playerRef.current;
    const e = enemyRef.current;

    // 1. Camera Viewport offsets centered on Player with safety clamps
    const cx = p.x - canvas.width / 2;
    const cy = p.y - canvas.height / 2;
    const camX = Math.max(0, Math.min(MAP_WIDTH - canvas.width, cx));
    const camY = Math.max(0, Math.min(MAP_HEIGHT - canvas.height, cy));

    ctx.save();
    ctx.translate(-camX, -camY);

    // 2. Draw Floor (decrépit tiles rendering mockup)
    ctx.fillStyle = '#0a0907'; // dirty dark mud green floor
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Floor grid patterns
    ctx.strokeStyle = '#12120e';
    ctx.lineWidth = 1;
    const gridSize = 80;
    for (let x = 0; x < MAP_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, MAP_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < MAP_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(MAP_WIDTH, y);
      ctx.stroke();
    }

    // Blood splatters decorative spots on map
    ctx.fillStyle = 'rgba(74, 9, 9, 0.45)';
    ctx.beginPath();
    ctx.arc(1150, 150, 40, 0, Math.PI * 2);
    ctx.arc(1300, 260, 20, 0, Math.PI * 2);
    ctx.arc(250, 910, 30, 0, Math.PI * 2);
    ctx.arc(750, 500, 25, 0, Math.PI * 2);
    ctx.fill();

    // 3. Dynamic Ambient Light Layer + Flashlight Cone!
    // We construct a shadows clipping mask overlay on top of background
    // Calculate light polygons
    const walls = mapData.walls;
    const flashlightRadius = 380;
    const playerVisionPolys: Vector2D[][] = [];

    // Ambient self-glowing circle around player
    const ambientPoly = calculateVisibility(p.x, p.y, walls, p.isHiding ? 20 : 85);
    playerVisionPolys.push(ambientPoly);

    // Flashlight beam poly
    if (p.flashlightOn && !p.isHiding) {
      const beamPoly = calculateVisibility(
        p.x,
        p.y,
        walls,
        flashlightRadius,
        p.angle,
        Math.PI * 0.28 // 50 degrees beam
      );
      playerVisionPolys.push(beamPoly);
    }

    // Draw Stalker's red glowing warning cone
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.05)';
    const enemyVisionPoly = calculateVisibility(
      e.x,
      e.y,
      walls,
      320,
      e.angle,
      Math.PI * 0.40
    );

    // We draw shadowing:
    // To do shadow polygons, we first paint a complete opaque black mask
    // over the whole screen, then we CLIP / clear paths using our vision geometry!
    // This looks beautifully dynamic and atmospheric.

    // 4. Render Game Objects (Always visible, inside ambient or flashlight beams)
    // Draw Hiding Spots (Metal Lockers / Beds)
    mapData.hidingSpots.forEach((spot) => {
      ctx.fillStyle = '#1c1b18';
      ctx.strokeStyle = '#2d2d25';
      ctx.lineWidth = 2;
      ctx.fillRect(spot.x, spot.y, spot.width, spot.height);
      ctx.strokeRect(spot.x, spot.y, spot.width, spot.height);

      // Lockers decorative metal lines
      ctx.strokeStyle = '#3e3d35';
      ctx.lineWidth = 1;
      for (let i = 5; i < spot.width; i += 8) {
        ctx.beginPath();
        ctx.moveTo(spot.x + i, spot.y + 4);
        ctx.lineTo(spot.x + i, spot.y + spot.height - 4);
        ctx.stroke();
      }
    });

    // Draw Exit Gate Main Core south
    ctx.fillStyle = '#110303';
    ctx.fillRect(700, 975, 100, 25);
    ctx.strokeStyle = fusesInserted >= 4 ? '#22c55e' : '#dc2626';
    ctx.lineWidth = 3;
    ctx.strokeRect(700, 975, 100, 25); // flashing alarm outline

    // Draw Items
    mapData.items.forEach((item) => {
      if (item.collected) return;

      // Pulse glows
      const pulseScalar = 1 + Math.sin(timeNow * 0.005) * 0.15;

      if (item.type === 'fuse') {
        // Red fuses
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(item.x, item.y, 6 * pulseScalar, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#fca5a5';
        ctx.stroke();
      } else if (item.type === 'battery') {
        // Yellow batteries
        ctx.fillStyle = '#eab308';
        ctx.fillRect(item.x - 4, item.y - 7, 8, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(item.x - 2, item.y - 10, 4, 3);
      } else if (item.type === 'key') {
        // Red or Blue shiny cards
        ctx.fillStyle = item.keyColor === 'red' ? '#dc2626' : '#2563eb';
        ctx.fillRect(item.x - 7, item.y - 5, 14, 10);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(item.x - 7, item.y - 5, 14, 10);
      } else if (item.type === 'diary') {
        // Vintage letters
        ctx.fillStyle = '#eedcb4';
        ctx.beginPath();
        ctx.moveTo(item.x - 8, item.y - 6);
        ctx.lineTo(item.x + 8, item.y - 6);
        ctx.lineTo(item.x + 8, item.y + 8);
        ctx.lineTo(item.x - 8, item.y + 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#6f4e37';
        ctx.stroke();
      }
    });

    // 5. DRAW COMPREHENSIVE BLACK SHADOW MASK OVERLAY
    ctx.save();
    // Build darkness offscreen
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const mctx = maskCanvas.getContext('2d');
    if (mctx) {
      mctx.fillStyle = 'rgba(2, 2, 2, 0.965)'; // near total blackout darkness!
      mctx.fillRect(0, 0, canvas.width, canvas.height);

      // We clear visibility triangles using destination-out layout
      mctx.globalCompositeOperation = 'destination-out';

      // Clear player vision shapes
      playerVisionPolys.forEach((poly) => {
        if (poly.length === 0) return;
        mctx.beginPath();
        mctx.moveTo(poly[0].x - camX, poly[0].y - camY);
        for (let idx = 1; idx < poly.length; idx++) {
          mctx.lineTo(poly[idx].x - camX, poly[idx].y - camY);
        }
        mctx.closePath();
        mctx.fill();
      });

      // Clear small glowing pulse around Enemy (spooky faint heartbeat thermal signature)
      if (isPointVisible({ x: p.x, y: p.y }, { x: e.x, y: e.y }, walls, 400) && !p.isHiding) {
        mctx.beginPath();
        mctx.arc(e.x - camX, e.y - camY, 65, 0, Math.PI * 2);
        mctx.fill();
      }
    }

    // Paint dynamic darkness shadow overlay onto main canvas relative to camera
    ctx.restore();
    ctx.drawImage(maskCanvas, camX, camY);

    // 6. Draw dynamic glowing lighting edges using gradients
    // Flashlight beam glare visual fog effect
    if (p.flashlightOn && !p.isHiding) {
      const grad = ctx.createRadialGradient(p.x, p.y, 20, p.x, p.y, flashlightRadius);
      grad.addColorStop(0, 'rgba(255, 255, 230, 0.22)');
      grad.addColorStop(0.35, 'rgba(255, 255, 210, 0.12)');
      grad.addColorStop(0.85, 'rgba(255, 255, 180, 0.03)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      const angleLeft = p.angle - Math.PI * 0.14;
      const angleRight = p.angle + Math.PI * 0.14;
      ctx.arc(p.x, p.y, flashlightRadius, angleLeft, angleRight);
      ctx.closePath();
      ctx.fill();

      // Floating dust beam particles!
      ctx.fillStyle = 'rgba(235, 235, 210, 0.35)';
      particles.forEach((part) => {
        const angleToPart = Math.atan2(part.y - p.y, part.x - p.x);
        let d = angleToPart - p.angle;
        while (d < -Math.PI) d += Math.PI * 2;
        while (d > Math.PI) d -= Math.PI * 2;

        if (Math.abs(d) < Math.PI * 0.14 && distance({ x: part.x, y: part.y }, { x: p.x, y: p.y }) < flashlightRadius) {
          ctx.beginPath();
          ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Faint yellow ambient ring around survivor
    if (!p.isHiding) {
      const pGrad = ctx.createRadialGradient(p.x, p.y, 5, p.x, p.y, 85);
      pGrad.addColorStop(0, 'rgba(240, 235, 220, 0.15)');
      pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 85, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Render SCARY ENTITY "Sang Pengintai" (The Stalker)
    // Red ominous threat marker glow
    const stalkerSpot = isPointVisible({ x: p.x, y: p.y }, { x: e.x, y: e.y }, walls, 400);
    
    if (stalkerSpot && !p.isHiding) {
      // Glow boundary
      const redGrad = ctx.createRadialGradient(e.x, e.y, 5, e.x, e.y, 65);
      redGrad.addColorStop(0, 'rgba(220, 38, 38, 0.25)');
      redGrad.addColorStop(0.6, 'rgba(150, 0, 0, 0.08)');
      redGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = redGrad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 65, 0, Math.PI * 2);
      ctx.fill();

      // Draw Stalker Model (creepy dark grey blob with dynamic pulsing white eyes)
      ctx.fillStyle = '#0f0e0c';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();

      // Slender dark clothing shoulders decoration
      ctx.strokeStyle = '#1e1c18';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(e.x - 14, e.y - 2);
      ctx.lineTo(e.x + 14, e.y - 2);
      ctx.stroke();

      // Glowing spectral eyes! (Pulse creepily)
      const eyeOffset = 4;
      const eyePulsate = 1.0 + Math.sin(e.pulseTime * 2) * 0.25;

      ctx.fillStyle = '#ffffff';
      // Left eye
      const eyeLx = e.x + Math.cos(e.angle - 0.5) * eyeOffset;
      const eyeLy = e.y + Math.sin(e.angle - 0.5) * eyeOffset;
      ctx.beginPath();
      ctx.arc(eyeLx, eyeLy, 2 * eyePulsate, 0, Math.PI * 2);
      ctx.fill();

      // Right eye
      const eyeRx = e.x + Math.cos(e.angle + 0.5) * eyeOffset;
      const eyeRy = e.y + Math.sin(e.angle + 0.5) * eyeOffset;
      ctx.beginPath();
      ctx.arc(eyeRx, eyeRy, 2 * eyePulsate, 0, Math.PI * 2);
      ctx.fill();

      // Red Stalker vision cone lines outline (visible only when closer)
      if (e.state === 'chase') {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(
          e.x + Math.cos(e.angle - Math.PI * 0.2) * 180,
          e.y + Math.sin(e.angle - Math.PI * 0.2) * 180
        );
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(
          e.x + Math.cos(e.angle + Math.PI * 0.2) * 180,
          e.y + Math.sin(e.angle + Math.PI * 0.2) * 180
        );
        ctx.stroke();
      }
    }

    // 8. Draw Survivor PLAYER
    if (!p.isHiding) {
      // Body Shadow backing
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(p.x, p.y + 4, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Player circle model (scary detective brown/grey jacket palette)
      ctx.fillStyle = p.movementMode === 'run' ? '#3f3e30' : p.movementMode === 'crouch' ? '#22221e' : '#4a493a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#636254';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Hair/Head details
      ctx.fillStyle = '#1c1b18';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Direction indicator (where face points)
      ctx.fillStyle = '#eedbae';
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(p.angle) * 7, p.y + Math.sin(p.angle) * 7, 3, 0, Math.PI * 2);
      ctx.fill();

      // Noise generation radius visual indicator! (Very helpful mechanical visualization)
      if (p.noiseLevel > 15) {
        ctx.strokeStyle = p.movementMode === 'run' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.10)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.noiseLevel, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 9. DRAW STRUCTURAL SOLID WALLS ON TOP FOR VISUAL crispness
    ctx.strokeStyle = '#181b16'; // decaying dark metallic walls
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    mapData.walls.forEach((wall) => {
      // Skip opened doors
      if (wall.isOpenDoor === true) return;

      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);

      // If it is a key door, change brush colors
      if (wall.isOpenDoor === false) {
        // Red room door check (y=310)
        if (wall.y1 === 310 && wall.y2 === 310) {
          ctx.strokeStyle = '#dc2626'; // glowing locked red gate
          ctx.lineWidth = 4;
        } else if (wall.x1 === 1050 && wall.x2 === 1050) {
          ctx.strokeStyle = '#2563eb'; // glowing locked blue gate
          ctx.lineWidth = 4;
        } else {
          ctx.strokeStyle = '#854d0e'; // wooden closed security door
          ctx.lineWidth = 5;
        }
      } else {
        ctx.strokeStyle = '#181b16';
        ctx.lineWidth = 6.5;
      }

      ctx.stroke();
    });

    ctx.restore();
  };

  // Convert Stalker proximity to float for EKG rate calculations
  const calculateProximityFloat = () => {
    const p = player;
    const e = enemy;
    const d = distance({ x: p.x, y: p.y }, { x: e.x, y: e.y });
    return Math.max(0, Math.min(1, 1 - d / 450));
  };

  const currentProximity = calculateProximityFloat();

  return (
    <div className="flex-1 w-full flex flex-col md:flex-row bg-[#080808] relative overflow-hidden">
      
      {/* Dynamic Strobe overlay frame for jumpscares */}
      {strobeScreen && (
        <div id="horror-screamer-strobe" className="absolute inset-0 bg-red-600/35 z-40 pointer-events-none transition-all duration-75 mix-blend-difference" />
      )}

      {/* Main interactive area wrapper */}
      <div className="flex-1 min-h-[500px] h-full relative" id="game-arena-wrapper">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          className="w-full h-full block cursor-crosshair"
          title="Kelam - Arena Bermain"
        />

        {/* Ambient Noise HUD details */}
        {player.movementMode === 'run' && (
          <div className="absolute top-4 left-4 bg-red-950/70 border border-red-800/45 px-3 py-1.5 rounded-md text-red-400 font-mono text-[10px] uppercase font-bold animate-pulse">
            ● KAMU BERISIK (PENGINTAI MENDENGAR!)
          </div>
        )}

        {/* Dynamic Context Action prompts popping up on screen center bottom */}
        {actionPrompt && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/90 px-5 py-2.5 rounded-lg border border-neutral-800 text-amber-500 font-mono text-xs shadow-xl flex items-center gap-2 tracking-widest z-20">
            <ArrowUpRight className="w-4 h-4 animate-bounce text-amber-400" />
            <span>{actionPrompt.toUpperCase()}</span>
          </div>
        )}

        {/* Hiding Locker Mini-game */}
        {player.isHiding && (
          <HidingGame
            stalkerProximity={currentProximity}
            isStalkerNearby={enemy.state === 'search' || enemy.state === 'patrol'}
            onFail={() => {
              // drag out of locker
              exitLocker();
              soundManager.playJumpscare();
              setPhase('gameover');
            }}
            onExitHiding={exitLocker}
          />
        )}
      </div>

      {/* Right panel overlay HUD with EKG vital diagnostics, items inventories */}
      <aside className="w-full md:w-80 bg-[#050505] border-t md:border-t-0 md:border-l border-white/5 p-5 flex flex-col justify-between gap-6 relative select-none">
        
        {/* Diagnostic EKG component */}
        <FearIndicator
          panicLevel={player.panicLevel}
          heartbeatBPM={60 + (1 - distance(player, enemy) / 600) * 80}
          isHiding={player.isHiding}
        />

        {/* Battery & Objectives Panel */}
        <div className="space-y-4">
          <div className="p-4 bg-black/40 rounded border border-white/5 space-y-3">
            <h4 className="text-[10px] font-sans font-bold text-white/40 tracking-[0.2em] uppercase">AKSESORIS TENTARA</h4>

            {/* Batteries */}
            <div className="space-y-1">
              <div className="flex justify-between font-mono text-[11px] items-center">
                <span className="flex items-center gap-1.5 text-yellow-600/80">
                  <Zap className="w-3.5 h-3.5" /> BATERAI SENTER
                </span>
                <span className={player.flashlightBattery < 25 ? 'text-red-500 font-bold animate-pulse' : 'text-white/60'}>
                  {Math.round(player.flashlightBattery)}%
                </span>
              </div>
              <div className="h-[2px] bg-white/10 relative mt-1">
                <motion.div
                  className={`h-full ${player.flashlightBattery < 25 ? 'bg-red-500' : 'bg-white/60'}`}
                  theme={{ width: `${player.flashlightBattery}%` }}
                  animate={{ width: `${player.flashlightBattery}%` }}
                />
              </div>
            </div>

            {/* Toggles status */}
            <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-white/5">
              <span className="text-[10px] font-mono text-white/30">STATUS SENTER:</span>
              <button
                onClick={toggleFlashlight}
                className={`px-3 py-1 font-mono text-[9px] rounded uppercase font-bold border transition-colors ${player.flashlightOn ? 'bg-yellow-950/20 text-yellow-400 border-yellow-800/20' : 'bg-white/5 text-white/40 border-white/5'}`}
              >
                {player.flashlightOn ? 'MENYALA' : 'MATI'}
              </button>
            </div>
          </div>

          {/* Missions items counts */}
          <div className="p-4 bg-black/40 rounded border border-white/5 space-y-4">
            <h4 className="text-[10px] font-sans font-bold text-white/40 tracking-[0.2em] uppercase">LOGISTIK PELARIAN</h4>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-black/50 p-3 rounded border border-white/5 flex flex-col justify-center items-center text-center gap-1">
                <Power className={`w-4 h-4 ${fusesInserted >= 4 ? 'text-emerald-500' : 'text-white/40'}`} />
                <span className="text-[8px] font-mono text-white/30 uppercase leading-none mt-1">SEKRING DAYA</span>
                <span className="text-xs font-mono font-bold text-white/80 mt-1">
                  {fusesInserted}/4
                </span>
              </div>

              <div className="bg-black/50 p-3 rounded border border-white/5 flex flex-col justify-center items-center text-center gap-1">
                <Zap className="w-4 h-4 text-red-500/80" />
                <span className="text-[8px] font-mono text-white/30 uppercase leading-none mt-1">SISA SEKRING</span>
                <span className="text-xs font-mono font-bold text-white/80 mt-1">
                  {fusesCount} pcs
                </span>
              </div>
            </div>

            {/* Keys */}
            <div className="space-y-1.5 pt-1.5 border-t border-white/5">
              <div className="flex justify-between text-[9px] font-mono text-white/35 uppercase tracking-wide">
                <span>SEALED GATES ACCESS KEYS</span>
              </div>

              <div className="flex gap-2 text-[10px] font-mono">
                <div className={`flex-1 p-1.5 rounded flex items-center justify-center gap-1 border ${redKeyCollected ? 'bg-red-950/20 text-red-400 border-red-900/40' : 'bg-black/40 text-white/20 border-white/5'}`}>
                  <KeyRound className="w-3 h-3" /> RED KEY
                </div>
                <div className={`flex-1 p-1.5 rounded flex items-center justify-center gap-1 border ${blueKeyCollected ? 'bg-blue-950/20 text-blue-400 border-blue-900/40' : 'bg-black/40 text-white/20 border-white/5'}`}>
                  <KeyRound className="w-3 h-3" /> BLUE KEY
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer menu buttons */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <p className="text-[9px] font-mono text-white/20 leading-tight text-center uppercase tracking-widest pb-1">
            Tekan ESC untuk menjeda game
          </p>
          <button
            onClick={onExitToMenu}
            className="w-full py-2.5 bg-black hover:bg-white/5 text-white/60 hover:text-white border border-white/5 hover:border-white/10 rounded text-xs font-mono tracking-widest uppercase transition-all"
          >
            KEMBALI KE MENU
          </button>
        </div>

      </aside>

      {/* Diary Reader Modal Overlay */}
      {activeDiary !== null && (
        <DiaryModal
          diary={DIARIES[activeDiary]}
          onClose={() => setActiveDiary(null)}
        />
      )}
    </div>
  );
}
