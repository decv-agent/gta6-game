// Palmera City generation: road grid, city blocks, buildings, parks, palms, beach and sea.
// Also owns collision helpers (circle vs building rects, world bounds, water/sand zones).
import { PALETTE, WORLD } from './config.js';
import { createRandom } from './random.js';

export const roads = []; // centre lines: {axis:'x'|'y', at:number} — 'x' means a horizontal road at y=at
for (let i = 0; i <= 5; i++) { roads.push({ axis: 'y', at: 250 + i * WORLD.roadEvery }); roads.push({ axis: 'x', at: 250 + i * WORLD.roadEvery }); }
export const SEA_Y = 2620; // water south of this line; sand band just north of it

export function isOnRoad(x, y) {
  const hw = WORLD.roadWidth / 2;
  for (const r of roads) { if (r.axis === 'x' && Math.abs(y - r.at) <= hw) return true; if (r.axis === 'y' && Math.abs(x - r.at) <= hw) return true; }
  return false;
}
export function nearestRoadPoint(x, y) {
  let best = null, bd = 1e12;
  for (const r of roads) {
    const p = r.axis === 'x' ? { x, y: r.at } : { x: r.at, y };
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

export function createCity(seed = 7) {
  const rnd = createRandom(seed);
  const buildings = [], palms = [], parks = [];
  const hw = WORLD.roadWidth / 2, walk = 16;
  for (let bx = 0; bx < 6; bx++) for (let by = 0; by < 6; by++) {
    // blocks sit BETWEEN the roads: road centres are at 250 + i*roadEvery
    const x0 = 250 + bx * WORLD.roadEvery + hw + walk, y0 = 250 + by * WORLD.roadEvery + hw + walk;
    const x1 = 250 + (bx + 1) * WORLD.roadEvery - hw - walk, y1 = 250 + (by + 1) * WORLD.roadEvery - hw - walk;
    if (y0 > SEA_Y - 60) continue; // beach blocks stay open sand
    if ((bx === 1 && by === 1) || (bx === 4 && by === 3)) { parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }); continue; }
    const n = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const w = 90 + rnd() * 130, h = 90 + rnd() * 130;
      const x = x0 + rnd() * Math.max(10, x1 - x0 - w), y = y0 + rnd() * Math.max(10, y1 - y0 - h);
      const ci = Math.floor(rnd() * PALETTE.buildings.length);
      buildings.push({ x, y, w, h, color: PALETTE.buildings[ci], roof: PALETTE.roofs[ci], floors: 2 + Math.floor(rnd() * 6), name: '' });
    }
    for (let i = 0; i < 5; i++) palms.push({ x: x0 + rnd() * (x1 - x0), y: y0 + rnd() * (y1 - y0), s: 0.8 + rnd() * 0.5 });
  }
  // beach palms along the sand
  for (let i = 0; i < 26; i++) palms.push({ x: 60 + rnd() * (WORLD.size - 120), y: SEA_Y - 130 + rnd() * 90, s: 0.9 + rnd() * 0.6 });
  return { buildings, palms, parks };
}

export function collideCircle(city, x, y, r) {
  // returns corrected {x,y} pushed out of buildings; also clamps to world & keeps land creatures out of deep water handled by caller
  x = Math.max(r, Math.min(WORLD.size - r, x)); y = Math.max(r, Math.min(WORLD.size - r, y));
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(b.x + b.w, x)), ny = Math.max(b.y, Math.min(b.y + b.h, y));
    const dx = x - nx, dy = y - ny, d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 === 0) { y = b.y - r; continue; }
      const d = Math.sqrt(d2); x = nx + (dx / d) * r; y = ny + (dy / d) * r;
    }
  }
  return { x, y };
}
export function hitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(b.x + b.w, x)), ny = Math.max(b.y, Math.min(b.y + b.h, y));
    if ((x - nx) ** 2 + (y - ny) ** 2 < r * r) return b;
  }
  return null;
}
export function lineOfSight(city, x1, y1, x2, y2) {
  const steps = 14;
  for (let i = 1; i < steps; i++) {
    const x = x1 + (x2 - x1) * (i / steps), y = y1 + (y2 - y1) * (i / steps);
    for (const b of city.buildings) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return false;
  }
  return true;
}
