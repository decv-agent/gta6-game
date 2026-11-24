// Palmera Heat — boot, game state, the loop, screens and demo scenes.
// Rico Sol, courier, one long sunset in Palmera City.
import { WORLD, STORAGE_KEY } from './config.js';
import { createRandom } from './random.js';
import { buildWorld } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { spawnTraffic, spawnParked, updateTrafficCar } from './traffic.js';
import { spawnPeds, updatePed } from './pedestrians.js';
import { createWanted, commitCrime, updateWanted, updateCop, updateBust } from './police.js';
import { createMissionState, currentMission, startMissionBanner, updateMissions } from './missions.js';
import { createPlayer, updatePlayer, updateBullets, nearestCar, policeContact } from './player.js';
import { drawWorld } from './render.js';
import { drawHud } from './hud.js';

const params = new URLSearchParams(window.location.search);
const scene = params.get('scene') || '';
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261124;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let viewW = 1280, viewH = 720;
function resize() {
  const ratio = window.devicePixelRatio || 1;
  viewW = window.innerWidth; viewH = window.innerHeight;
  canvas.width = Math.round(viewW * ratio);
  canvas.height = Math.round(viewH * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function loadSave() {
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null'); }
  catch { return null; }
}
const saved = loadSave();

const rng = createRandom(seed ^ 0x9e3779b9);
const world = buildWorld(seed);

const G = {
  world, rng, time: 0,
  input: createInput(),
  audio: createAudio(),
  player: createPlayer(420, 420),
  cars: [], peds: [], bullets: [],
  wanted: createWanted(),
  missions: createMissionState(saved),
  cash: saved && Number.isFinite(saved.cash) ? saved.cash : 120,
  bust: 0, shake: 0, hurtFlash: 0,
  message: '', messageTimer: 0,
  lastShotAt: -99,
  camera: { x: 0, y: 0 },
  screen: 'title',
  nearCar: null,
  currentMission: () => currentMission(G),
  commitCrime: (kind) => commitCrime(G, kind),
  flashMessage(text) { G.message = text; G.messageTimer = 3; },
  saveGame() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ cash: G.cash, mission: G.missions.index }));
    } catch { /* private mode: progress lasts the session */ }
  },
  triggerBusted() {
    if (G.screen !== 'play') return;
    G.screen = 'busted';
    G.endTimer = 0;
    G.audio.bust();
    const fine = Math.min(G.cash, 150 + G.wanted.stars * 100);
    G.cash -= fine;
    G.finePaid = fine;
  },
  triggerWasted() {
    if (G.screen !== 'play') return;
    G.screen = 'wasted';
    G.endTimer = 0;
    G.audio.bust();
  },
};
G.endTimer = 0;
G.finePaid = 0;

G.cars = [...spawnTraffic(world, rng, 15), ...spawnParked(world, rng, 13)];
G.peds = spawnPeds(G, 30);

function respawn() {
  G.player = createPlayer(420, 420);
  G.wanted = createWanted();
  G.bust = 0;
  G.cars = G.cars.filter((c) => !c.cop);
  G.screen = 'play';
  G.saveGame();
}

function resetStory() {
  G.missions = createMissionState(null);
  G.wanted = createWanted();
  G.cars = G.cars.filter((c) => !c.cop);
  startMissionBanner(G);
  G.saveGame();
}

// ---- Demo scenes (?scene=) -------------------------------------------------
function stageScene(name) {
  if (name === 'title') { G.screen = 'title'; return; }
  G.screen = 'play';
  if (name === 'foot') {
    G.player.x = 460; G.player.y = 460;
    if (G.missions.index !== 0) G.missions.index = 0;
    startMissionBanner(G);
    return;
  }
  if (name === 'drive' || name === 'chase') {
    const stars = name === 'drive' ? 3 : 5;
    // Put Rico in the nearest car and light the city up.
    const car = G.cars.find((c) => !c.parked && !c.cop) || G.cars[0];
    car.parked = false; car.driver = true;
    car.x = 620; car.y = 600 - 23; car.angle = 0; car.speed = 240;
    G.player.car = car;
    G.player.x = car.x; G.player.y = car.y;
    if (name === 'drive' && G.missions.index < 1) { G.missions.index = 1; startMissionBanner(G); }
    for (let i = 0; i < stars; i++) commitCrime(G, 'copHit');
    G.wanted.stars = stars;
    G.wanted.lastKnown = { x: car.x, y: car.y };
    // Cruisers spawn via updateWanted in proportion to stars (drive: 3 stars
    // settles at 4 cars, trimmed by the pursuit logic; chase: 5 stars = 6).
    // Mark Rico seen so they converge on him from the first frame.
    G.wanted.seen = true;
    return;
  }
  G.screen = 'title';
}
stageScene(scene);

// Title screen: the city drifts on its own behind the logo.
let titleDrift = 0;

function step(dt) {
  G.time += dt;
  titleDrift += dt;
  G.hurtFlash = Math.max(0, G.hurtFlash - dt * 1.4);
  G.shake = Math.max(0, G.shake - dt * 22);
  if (G.messageTimer > 0) G.messageTimer -= dt;

  const drivingScene = (scene === 'drive' || scene === 'chase') && G.screen === 'play';

  if (G.screen === 'play') {
    if (!drivingScene) updatePlayer(G, dt);
    else {
      // Attract mode: the demo car cruises east while cruisers converge.
      const car = G.player.car;
      if (car) {
        car.speed += (250 - car.speed) * dt;
        car.x += Math.cos(car.angle) * car.speed * dt;
        car.y += Math.sin(car.angle) * car.speed * dt;
        if (car.x > 2200) { car.x = 320; }
        G.player.x = car.x; G.player.y = car.y;
        G.player.fireCooldown -= dt;
      }
    }
    updateBullets(G, dt);
    updateMissions(G, dt);
  }
  // The living city always moves: traffic, peds, police.
  for (const car of G.cars) {
    if (car.cop) updateCop(G, car, dt);
    else if (car !== G.player.car) updateTrafficCar(G, car, dt);
  }
  for (const ped of G.peds) updatePed(G, ped, dt);
  if (G.screen === 'play') {
    updateWanted(G, dt);
    policeContact(G, dt);
    updateBust(G, dt);
    G.nearCar = G.player.car ? null : nearestCar(G, 52);
  }
  G.audio.setSiren(G.cars.some((c) => c.cop && Math.hypot(c.x - G.player.x, c.y - G.player.y) < 700), G.time);
  if (!G.player.car) G.audio.setEngine(0, false);

  // Camera follows the player (or drifts across downtown on the title screen).
  let tx, ty;
  if (G.screen === 'title' && !scene) {
    tx = 900 + Math.cos(titleDrift * 0.07) * 420 - viewW / 2;
    ty = 1200 + Math.sin(titleDrift * 0.05) * 420 - viewH / 2;
  } else if (G.screen === 'title') {
    tx = 700 - viewW / 2 + Math.cos(titleDrift * 0.05) * 200;
    ty = 700 - viewH / 2 + Math.sin(titleDrift * 0.04) * 200;
  } else {
    const px = G.player.car ? G.player.car.x : G.player.x;
    const py = G.player.car ? G.player.car.y : G.player.y;
    tx = px - viewW / 2; ty = py - viewH / 2;
  }
  G.camera.x += (tx - G.camera.x) * Math.min(1, dt * 5);
  G.camera.y += (ty - G.camera.y) * Math.min(1, dt * 5);
  G.camera.x = Math.max(0, Math.min(WORLD.size - viewW, G.camera.x));
  G.camera.y = Math.max(0, Math.min(WORLD.size - viewH, G.camera.y));
  if (G.shake > 0) {
    G.camera.x += (Math.random() - 0.5) * G.shake;
    G.camera.y += (Math.random() - 0.5) * G.shake;
  }
  if ((G.screen === 'busted' || G.screen === 'wasted')) {
    G.endTimer += dt;
    if (G.endTimer > 2.6) respawn();
  }
}

function handleKeys() {
  const input = G.input;
  if (input.justPressed('Space', 'Enter')) {
    G.audio.unlock();
    if (G.screen === 'title') {
      G.screen = 'play';
      if (currentMission(G)) startMissionBanner(G);
    }
  }
  if (input.justPressed('Escape', 'KeyP')) {
    if (G.screen === 'play') G.screen = 'paused';
    else if (G.screen === 'paused') G.screen = 'play';
  }
  if (input.justPressed('KeyR') && G.screen === 'play' && G.missions.complete) resetStory();
  if (input.justPressed('KeyM')) { /* minimap is always live; M reserved */ }
}

function drawOverlay() {
  ctx.textAlign = 'center';
  if (G.screen === 'title') {
    const grad = ctx.createLinearGradient(0, 0, 0, viewH);
    grad.addColorStop(0, 'rgba(80,20,60,0.35)');
    grad.addColorStop(1, 'rgba(20,10,30,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 74px system-ui, sans-serif';
    ctx.fillText('PALMERA HEAT', viewW / 2, viewH * 0.34);
    ctx.fillStyle = '#fff';
    ctx.font = '19px system-ui, sans-serif';
    ctx.fillText('Rico Sol • courier • one long sunset in Palmera City', viewW / 2, viewH * 0.34 + 42);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText('WASD drive & walk • E enter car • mouse aim, click shoot • Shift sprint', viewW / 2, viewH * 0.34 + 78);
    ctx.fillText('Esc pause • Finish 3 courier jobs, outrun the Palmera PD', viewW / 2, viewH * 0.34 + 104);
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 22px system-ui, sans-serif';
    const blink = Math.sin(G.time * 3) > -0.4;
    if (blink) ctx.fillText('PRESS SPACE TO PLAY', viewW / 2, viewH * 0.34 + 152);
    return;
  }
  if (G.screen === 'paused') {
    ctx.fillStyle = 'rgba(12,8,22,0.6)';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText('PAUSED', viewW / 2, viewH / 2 - 10);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Esc or P to resume', viewW / 2, viewH / 2 + 26);
    return;
  }
  if (G.screen === 'busted' || G.screen === 'wasted') {
    ctx.fillStyle = G.screen === 'busted' ? 'rgba(20,30,90,0.55)' : 'rgba(90,10,10,0.55)';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText(G.screen === 'busted' ? 'BUSTED' : 'WASTED', viewW / 2, viewH / 2);
    ctx.font = '17px system-ui, sans-serif';
    if (G.screen === 'busted') ctx.fillText(`The Palmera PD fine you $${G.finePaid}. Back on the street in a moment…`, viewW / 2, viewH / 2 + 40);
    else ctx.fillText('The clinic patches Rico up. The city keeps moving…', viewW / 2, viewH / 2 + 40);
  }
}

let last = performance.now();
let acc = 0;
const STEP = 1 / 60;
function frame(now) {
  requestAnimationFrame(frame);
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  handleKeys();
  if (G.screen !== 'paused') {
    while (acc >= STEP) { step(STEP); acc -= STEP; }
  } else acc = 0;
  drawWorld(ctx, G, viewW, viewH);
  if (G.screen === 'play' || G.screen === 'paused') drawHud(ctx, G, viewW, viewH);
  drawOverlay();
  G.input.endFrame();
}
requestAnimationFrame(frame);

// First gesture unlocks audio (autoplay policy).
window.addEventListener('pointerdown', () => G.audio.unlock(), { once: false });
window.addEventListener('keydown', () => G.audio.unlock(), { once: false });

window.__palmera = G;
