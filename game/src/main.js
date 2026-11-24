// PALMERA HEAT — boot, game state, the loop, combat, crime & punishment, demo scenes.
// Screens: title (over the live city), play, paused, busted, wasted.
// ?scene=title|drive|foot|chase stages an animated demo scene (attract mode) for each view.
import { STEP, SAVE_KEY, WORLD } from './config.js';
import { createCity, nearestRoadPoint, hitsBuilding } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPeds, updatePeds } from './pedestrians.js';
import { createPoliceState, updatePolice } from './police.js';
import { createMissions, currentObjective, currentMarker, startMission, updateMissions, STORY } from './missions.js';
import { createPlayer, enterExitCar, updatePlayerOnFoot, updatePlayerCar } from './player.js';
import { drawWorld } from './render.js';
import { drawHud, drawMinimap, drawOverlay } from './hud.js';

const params = new URLSearchParams(location.search);
const scene = params.get('scene') || params.get('shot');
const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const input = createInput(canvas), audio = createAudio();
let vw = 0, vh = 0;
function resize() { vw = canvas.width = innerWidth; vh = canvas.height = innerHeight; }
addEventListener('resize', resize); resize();

let saved = {}; try { saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch { saved = {}; }
const city = createCity(7);
const traffic = createTraffic(21);
const peds = createPeds(33, 26);
const police = createPoliceState();
const missions = createMissions(saved.mission || 0);
const player = createPlayer(285, 560); // on the west sidewalk of Palmera Ave
let screen = 'title', cash = saved.cash ?? 120, wanted = 0, crimeCooldown = 0, endT = 0, time = 0;
const bullets = [];
if (!missions.done) startMission(missions);

const game = {
  city, player, peds, police, missions, bullets,
  get cash() { return cash; }, get wanted() { return wanted; },
  get marker() { return currentMarker(missions); },
  get objective() { return currentObjective(missions); },
  allCars: () => [...traffic, ...police.cars],
  playerPos: () => player.car || player,
  addCash: (n) => { cash += n; audio.cash(); },
  raiseWanted: (n) => { wanted = Math.min(5, Math.max(wanted, n)); },
  setWanted: (n) => { wanted = Math.max(0, n); },
  save: () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ cash, mission: missions.index })); } catch { /* private mode */ } },
};
function crime(level, x, y) {
  // a crime counts double when a cruiser or a witness ped is close by
  let seen = police.cars.some((c) => Math.hypot(c.x - x, c.y - y) < 460) || peds.some((p) => !p.dead && Math.hypot(p.x - x, p.y - y) < 190);
  if (seen || level >= 2) game.raiseWanted(level);
  crimeCooldown = 1;
}
function endRun(kind) {
  screen = kind; endT = 3.2; audio.busted();
  if (kind === 'busted') cash = Math.max(0, cash - 200); else cash = Math.max(0, cash - 150);
}
function respawn() {
  wanted = 0; police.cars.length = 0; police.lastKnown = null; player.health = 100; player.car = null;
  player.x = 285; player.y = 560; screen = 'play'; game.save();
}

// ---------- demo scenes (attract mode) ----------
let demo = null; // {kind, waypoint}
function pickWaypoint(x, y) { const p = nearestRoadPoint(x + (Math.random() - 0.5) * 900, y + (Math.random() - 0.5) * 900); return p; }
function stageScene(name) {
  if (name === 'foot') {
    screen = 'play'; player.x = 712; player.y = 690; missions.index = 0; missions.done = false; startMission(missions);
    demo = { kind: 'foot', waypoint: { x: 712, y: 1250 } }; // stroll south down the avenue
  } else if (name === 'drive' || name === 'chase') {
    screen = 'play';
    const car = traffic.find((c) => c.parked) || traffic[0];
    car.x = 1250; car.y = 776; car.angle = 0; car.parked = false;
    player.x = car.x; player.y = car.y;
    enterExitCar(player, [car], null);
    wanted = name === 'chase' ? 5 : 3;
    missions.index = name === 'chase' ? 2 : 1; missions.done = false; startMission(missions);
    missions.banner = name === 'chase' ? 'Five stars! The whole Palmera PD is on Rico!' : STORY[1].banner; missions.bannerT = 999;
    const n = name === 'chase' ? 5 : 2;
    for (let i = 0; i < n; i++) police.cars.push({ x: car.x - 130 - i * 90, y: car.y + (i % 2 ? 60 : -55), angle: 0, speed: 200, color: '#f4f6f8', w: 44, h: 22, police: true, parked: false, dead: false });
    // the demo driver loops one downtown block, staying on the roads the whole way
    demo = { kind: 'drive', wi: 0, loop: [{ x: 1750, y: 776 }, { x: 1776, y: 1250 }, { x: 1250, y: 1276 }, { x: 1224, y: 776 }] };
  } else { screen = 'title'; demo = { kind: 'title' }; }
}
if (scene) stageScene(scene);

// fake input for the demo driver / walker
function demoInput() {
  const keysOn = new Set();
  const fake = { down: (...cs) => cs.some((c) => keysOn.has(c)), moveVec: () => ({ x: 0, y: 0, active: false }) };
  if (!demo || demo.kind === 'title') return fake;
  const pos = game.playerPos();
  if (demo.loop) { demo.waypoint = demo.loop[demo.wi]; if (Math.hypot(demo.waypoint.x - pos.x, demo.waypoint.y - pos.y) < 120) { demo.wi = (demo.wi + 1) % demo.loop.length; demo.waypoint = demo.loop[demo.wi]; } }
  const target = demo.waypoint;
  if (!demo.loop && Math.hypot(target.x - pos.x, target.y - pos.y) < 90) demo.waypoint = pickWaypoint(pos.x, pos.y);
  const want = Math.atan2(demo.waypoint.y - pos.y, demo.waypoint.x - pos.x);
  if (demo.kind === 'drive' && player.car) {
    let diff = want - player.car.angle; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
    keysOn.add('KeyW'); if (diff < -0.12) keysOn.add('KeyA'); if (diff > 0.12) keysOn.add('KeyD');
    if (Math.abs(diff) > 2.4) keysOn.add('KeyS');
  } else if (demo.kind === 'foot') {
    fake.moveVec = () => { const dx = Math.cos(want), dy = Math.sin(want); return { x: dx, y: dy, active: true }; };
  }
  return fake;
}

// ---------- combat & collisions ----------
function shoot() {
  if (player.car || player.fireT > 0) return;
  player.fireT = 0.22;
  const wx = player.x + (input.mouse.x - vw / 2), wy = player.y + (input.mouse.y - vh / 2);
  const a = Math.atan2(wy - player.y, wx - player.x); player.angle = a;
  bullets.push({ x: player.x + Math.cos(a) * 18, y: player.y + Math.sin(a) * 18, vx: Math.cos(a) * 780, vy: Math.sin(a) * 780, life: 0.55 });
  audio.shot(); crime(1, player.x, player.y);
  for (const p of peds) if (Math.hypot(p.x - player.x, p.y - player.y) < 150) p.panic = 2.5;
}
function stepBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    let kill = b.life <= 0 || hitsBuilding(city, b.x, b.y, 3);
    if (!kill) for (const p of peds) { if (!p.dead && Math.hypot(p.x - b.x, p.y - b.y) < 12) { p.dead = true; p.fallT = 0; crime(3, b.x, b.y); kill = true; break; } }
    if (!kill) for (const c of game.allCars()) { if (!c.playerDriven && Math.hypot(c.x - b.x, c.y - b.y) < 26) { if (c.police) crime(3, b.x, b.y); else crime(2, b.x, b.y); c.speed *= 0.4; kill = true; break; } }
    if (kill) bullets.splice(i, 1);
  }
}
function stepCollisions(dt) {
  const pos = game.playerPos();
  // cars running down peds / the player
  for (const c of game.allCars()) {
    if (Math.abs(c.speed) < 60) continue;
    for (const p of peds) { if (!p.dead && Math.hypot(p.x - c.x, p.y - c.y) < 24) { p.dead = true; if (c.playerDriven) { crime(3, p.x, p.y); audio.crash(); } } }
    if (!player.car && c !== player.car && Math.hypot(player.x - c.x, player.y - c.y) < 26 && c.police) { player.health -= 26 * dt * 3; player.hurtT = 0.3; }
  }
  // car vs car bumps
  const cars = game.allCars();
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
    const a = cars[i], b = cars[j], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < 40 && d > 0) {
      const push = (40 - d) / 2, ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
      a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push;
      const hard = Math.abs(a.speed - b.speed) > 170;
      if (hard) { const s = (a.speed + b.speed) / 2; a.speed = s * 0.5; b.speed = s * 0.5; if (a.playerDriven || b.playerDriven) { crime(2, pos.x, pos.y); player.health -= 4; audio.crash(); } }
    }
  }
  // police contact drains health when wasted is near; cruisers ram
  if (player.car) for (const c of police.cars) if (Math.hypot(c.x - player.car.x, c.y - player.car.y) < 42 && Math.abs(c.speed) > 200) { player.health -= 9 * dt; player.hurtT = 0.2; }
}

// ---------- one simulation step ----------
function step(dt) {
  time += dt; if (crimeCooldown > 0) crimeCooldown -= dt;
  const inp = demo ? demoInput() : input;
  if (screen === 'play') {
    if (player.car) updatePlayerCar(player, dt, inp, city, audio); else updatePlayerOnFoot(player, dt, inp, city, null);
    if (!demo) {
      if (input.take('KeyE') || input.take('KeyF')) { const r = enterExitCar(player, game.allCars(), () => crime(1, player.x, player.y)); if (r === 'enter') audio.pickup(); }
      if (input.mouse.down) shoot();
      if (missions.done && input.take('KeyR')) { missions.index = 0; missions.done = false; startMission(missions); }
    }
    const ev = updateMissions(missions, dt, game); if (ev) audio.cash();
    const verdict = updatePolice(police, dt, game);
    if (verdict === 'busted') endRun('busted');
    if (player.health <= 0) endRun('wasted');
  } else if (screen === 'busted' || screen === 'wasted') {
    endT -= dt; if (endT <= 0 && !demo) respawn();
  } else if (screen === 'title' && demo?.kind === 'title') {
    // attract mode: the city lives behind the title
  }
  if (screen !== 'paused') {
    const danger = [];
    if (player.car && Math.abs(player.car.speed) > 130) danger.push({ x: player.car.x, y: player.car.y, r: 130 });
    if (bullets.length) danger.push({ x: player.x, y: player.y, r: 190 });
    updateTraffic(traffic, dt, [...game.allCars(), player.car ? null : player].filter(Boolean));
    updatePeds(peds, dt, city, danger);
    for (const p of peds) if (!p.dead) p.walkA = (p.walkA || 0) + dt * 9;
    stepBullets(dt); stepCollisions(dt);
    // police keep hunting during play; on the title they just cruise with traffic rules offscreen
    if (screen === 'title') { /* no police on title */ }
    audio.update(dt, !!player.car, player.car ? Math.abs(player.car.speed) / 460 : 0, wanted > 0 && police.cars.length > 0);
  }
}

// ---------- frame ----------
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  acc += Math.min(0.25, (now - last) / 1000); last = now;
  // one-shot keys that change screens
  if (!demo) {
    if (input.take('Escape') || input.take('KeyP')) { if (screen === 'play') screen = 'paused'; else if (screen === 'paused') screen = 'play'; }
    if (screen === 'title' && (input.take('Enter') || input.take('Space') || input.take('Pointer'))) { audio.unlock(); screen = 'play'; }
    else if ((screen === 'busted' || screen === 'wasted') && (input.take('Enter') || input.take('Pointer'))) respawn();
  } else if (input.take('Pointer') || input.take('Enter')) audio.unlock();
  while (acc >= STEP) { step(STEP); acc -= STEP; }
  // camera: follow the player; on the title, drift slowly across downtown
  const focus = demo?.kind === 'title' ? { x: 1250 + Math.sin(time * 0.07) * 420, y: 1250 + Math.cos(time * 0.05) * 420 } : game.playerPos();
  const cam = { x: Math.max(0, Math.min(WORLD.size - vw, focus.x - vw / 2)), y: Math.max(0, Math.min(WORLD.size - vh, focus.y - vh / 2)) };
  drawWorld(ctx, game, cam, time, vw, vh);
  if (screen !== 'title') { drawHud(ctx, game, vw, vh); drawMinimap(minimap, game); minimap.style.display = 'block'; }
  else minimap.style.display = 'none';
  if (screen !== 'play') drawOverlay(ctx, game, vw, vh, screen);
  window.__palmeraReady = true;
}
requestAnimationFrame(frame);
