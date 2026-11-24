// Wanted level and the Palmera PD. Cruisers spawn in proportion to stars,
// chase the player's last known position, ram on contact, and search when
// they lose sight. Standing in contact range fills the bust meter.
import { WORLD, WANTED } from './config.js';
import { makeCar } from './traffic.js';
import { circleHitsBuilding, lineOfSight } from './world.js';

export function createWanted() {
  return {
    stars: 0, heat: 0, hiddenTime: 0, decayTimer: 0,
    lastKnown: null, seen: false,
  };
}

const CRIME_HEAT = { theft: 1, crash: 0.5, pedHit: 1.5, shot: 0.7, carHit: 0.6, copHit: 2 };

export function commitCrime(G, kind) {
  const w = G.wanted;
  // Witness check: a crime counts double when a ped or cruiser can see it.
  let witnessed = false;
  for (const p of G.peds) {
    if (!p.down && Math.hypot(p.x - G.player.x, p.y - G.player.y) < 260 &&
        lineOfSight(G.world, p.x, p.y, G.player.x, G.player.y)) { witnessed = true; break; }
  }
  if (!witnessed) {
    for (const c of G.cars) {
      if (c.cop && Math.hypot(c.x - G.player.x, c.y - G.player.y) < 420) { witnessed = true; break; }
    }
  }
  const base = CRIME_HEAT[kind] || 0.5;
  w.heat += witnessed ? base : base * 0.45;
  while (w.heat >= 1 && w.stars < 5) { w.stars += 1; w.heat -= 1; }
  if (w.stars >= 5) w.heat = Math.min(w.heat, 0.99);
  if (w.stars > 0) { w.hiddenTime = 0; w.decayTimer = 0; }
}

export function updateWanted(G, dt) {
  const w = G.wanted;
  const px = G.player.car ? G.player.car.x : G.player.x;
  const py = G.player.car ? G.player.car.y : G.player.y;
  // Seen if any cruiser has line of sight within range.
  w.seen = false;
  for (const c of G.cars) {
    if (!c.cop) continue;
    if (Math.hypot(c.x - px, c.y - py) < 460 && lineOfSight(G.world, c.x, c.y, px, py)) {
      w.seen = true;
      w.lastKnown = { x: px, y: py };
      break;
    }
  }
  if (w.seen || w.stars === 0) { w.hiddenTime = 0; w.decayTimer = 0; }
  else {
    w.hiddenTime += dt;
    if (w.hiddenTime > WANTED.decayDelay) {
      w.decayTimer += dt;
      if (w.decayTimer >= WANTED.decayEvery) {
        w.decayTimer = 0;
        w.stars = Math.max(0, w.stars - 1);
        w.heat = 0;
        if (w.stars === 0) w.lastKnown = null;
      }
    }
  }
  // Spawn / trim cruisers to match stars.
  const want = w.stars === 0 ? 0 : Math.min(6, w.stars + 1);
  const cops = G.cars.filter((c) => c.cop);
  if (cops.length < want) {
    const a = G.rng() * Math.PI * 2;
    const d = 620 + G.rng() * 160;
    const sx = Math.max(30, Math.min(WORLD.beachX - 40, px + Math.cos(a) * d));
    const sy = Math.max(30, Math.min(WORLD.size - 30, py + Math.sin(a) * d));
    if (!circleHitsBuilding(G.world, sx, sy, 18)) {
      const cop = makeCar(sx, sy, Math.atan2(py - sy, px - sx), '#2b4bd8', { cop: true, cruise: 330 });
      G.cars.push(cop);
    }
  } else if (cops.length > want + 2) {
    const idx = G.cars.indexOf(cops[cops.length - 1]);
    if (idx >= 0) G.cars.splice(idx, 1);
  }
}

export function updateCop(G, car, dt) {
  const w = G.wanted;
  const target = w.lastKnown || (w.seen ? { x: G.player.x, y: G.player.y } : null);
  car.sirenPhase += dt * 7;
  if (!target) {
    // No lead: slow patrol toward the city centre grid.
    car.speed += Math.max(-200 * dt, Math.min(120 * dt, 90 - car.speed));
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    return;
  }
  const dx = target.x - car.x, dy = target.y - car.y;
  const dist = Math.hypot(dx, dy);
  const wantAngle = Math.atan2(dy, dx);
  let diff = wantAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const topSpeed = 300 + G.wanted.stars * 26;
  const speedTarget = dist > 60 ? topSpeed : topSpeed * 0.35;
  car.speed += Math.max(-380 * dt, Math.min(240 * dt, speedTarget - car.speed));
  car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff * 3.2 * dt * 3));
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!circleHitsBuilding(G.world, nx, ny, 15)) { car.x = nx; car.y = ny; }
  else { car.speed *= 0.4; car.angle += 1.4 * dt; }
  car.x = Math.max(18, Math.min(WORLD.size - 18, car.x));
  car.y = Math.max(18, Math.min(WORLD.size - 18, car.y));
}

// Bust meter: fills while a cruiser is close and the player is slow/on foot.
export function updateBust(G, dt) {
  if (G.wanted.stars === 0 || G.screen !== 'play') { G.bust = Math.max(0, G.bust - dt * 0.7); return; }
  const px = G.player.car ? G.player.car.x : G.player.x;
  const py = G.player.car ? G.player.car.y : G.player.y;
  const pSpeed = G.player.car ? Math.abs(G.player.car.speed) : (G.player.moving ? 160 : 0);
  let near = false;
  for (const c of G.cars) {
    if (c.cop && Math.hypot(c.x - px, c.y - py) < 74) { near = true; break; }
  }
  if (near && pSpeed < 120) G.bust += dt / WANTED.bustTime;
  else G.bust = Math.max(0, G.bust - dt * 0.55);
  if (G.bust >= 1) G.triggerBusted();
}
