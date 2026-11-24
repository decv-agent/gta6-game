// Pedestrians: stroll along sidewalks beside the roads, wander in parks and on the beach,
// and flee in panic from gunfire, speeding cars and crashes.
import { WORLD } from './config.js';
import { roads, collideCircle, SEA_Y } from './world.js';
import { createRandom } from './random.js';

const SHIRTS = ['#ff5d8f', '#ffb703', '#3aafa9', '#f4f1de', '#e07a5f', '#81b29a', '#5e60ce', '#ffd6a5'];
export function createPeds(seed = 33, count = 26) {
  const rnd = createRandom(seed); const peds = [];
  for (let i = 0; i < count; i++) {
    const r = roads[Math.floor(rnd() * roads.length)], along = 80 + rnd() * (WORLD.size - 160), side = rnd() < 0.5 ? -1 : 1;
    const off = WORLD.roadWidth / 2 + 12;
    const x = r.axis === 'x' ? along : r.at + side * off, y = r.axis === 'x' ? r.at + side * off : along;
    peds.push({ x, y, angle: rnd() * 6.28, speed: 34 + rnd() * 26, shirt: SHIRTS[i % SHIRTS.length], panic: 0, turnT: 2 + rnd() * 4, dead: false, fallT: 0 });
  }
  return peds;
}
export function updatePeds(peds, dt, city, danger) {
  for (const p of peds) {
    if (p.dead) { p.fallT += dt; continue; }
    let flee = null;
    if (danger) for (const d of danger) { const dist = Math.hypot(p.x - d.x, p.y - d.y); if (dist < (d.r || 120)) { flee = { x: p.x - d.x, y: p.y - d.y }; p.panic = 2.5; break; } }
    p.turnT -= dt;
    if (flee) { p.angle = Math.atan2(flee.y, flee.x); p.panic -= dt; }
    else if (p.turnT <= 0) { p.turnT = 2 + Math.random() * 4; p.angle += (Math.random() - 0.5) * 1.8; }
    const sp = p.panic > 0 ? 175 : p.speed;
    let nx = p.x + Math.cos(p.angle) * sp * dt, ny = p.y + Math.sin(p.angle) * sp * dt;
    if (ny > SEA_Y - 40) { ny = p.y; p.angle = Math.PI + (Math.random() - 0.5); }
    const fixed = collideCircle(city, nx, ny, 10);
    if (Math.abs(fixed.x - nx) > 0.1 || Math.abs(fixed.y - ny) > 0.1) p.angle += 1.4;
    p.x = fixed.x; p.y = fixed.y;
  }
}
