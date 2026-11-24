// Palmera City generation: road grid, buildings, parks, palms, beach.
// Also owns collision queries and line-of-sight used by every other system.
import { WORLD, BUILDING_COLORS } from './config.js';
import { createRandom, pick, range } from './random.js';

export function buildWorld(seed) {
  const rng = createRandom(seed);
  const buildings = [];
  const palms = [];
  const parks = [];
  const B = WORLD.block, R = WORLD.road;
  // Lots sit between roads. Roads are centred on multiples of B.
  for (let gx = 0; gx * B < WORLD.beachX - 60; gx++) {
    for (let gy = 0; gy * B < WORLD.size; gy++) {
      const lotX = gx * B + R / 2 + 14;
      const lotY = gy * B + R / 2 + 14;
      const lotW = B - R - 28;
      const lotH = B - R - 28;
      if (lotX + lotW > WORLD.beachX - 20) continue;
      const roll = rng();
      if (roll < 0.14) {
        parks.push({ x: lotX, y: lotY, w: lotW, h: lotH });
        for (let i = 0; i < 7; i++) {
          palms.push({ x: lotX + rng() * lotW, y: lotY + rng() * lotH, s: range(rng, 0.8, 1.3) });
        }
        continue;
      }
      // One or two buildings per lot.
      const split = rng() < 0.4;
      const mk = (x, y, w, h) => ({
        x, y, w, h,
        color: pick(rng, BUILDING_COLORS),
        roof: pick(rng, BUILDING_COLORS),
        floors: 2 + Math.floor(rng() * 5),
        seed: Math.floor(rng() * 99999),
      });
      if (split) {
        const hw = (lotW - 16) / 2;
        buildings.push(mk(lotX, lotY, hw, lotH), mk(lotX + hw + 16, lotY, hw, lotH));
      } else {
        const inset = range(rng, 0, 26);
        buildings.push(mk(lotX + inset / 2, lotY + inset / 2, lotW - inset, lotH - inset));
      }
      // Sidewalk palms along the lot edge.
      if (rng() < 0.7) palms.push({ x: lotX - 6, y: lotY + rng() * lotH, s: range(rng, 0.8, 1.2) });
    }
  }
  // Beach palms scattered on the sand.
  for (let i = 0; i < 46; i++) {
    palms.push({ x: range(rng, WORLD.beachX + 10, WORLD.seaX - 20), y: rng() * WORLD.size, s: range(rng, 0.9, 1.5) });
  }
  return { buildings, palms, parks, rng };
}

// Roads run along the edges of each block cell: a point is on a road when it
// is within R/2 of a grid line, or inside the beach strip is never a road.
export function onRoad(x, y) {
  if (x >= WORLD.beachX || x < 0 || y < 0 || y >= WORLD.size) return false;
  const B = WORLD.block, half = WORLD.road / 2;
  const dx = Math.abs(((x % B) + B) % B);
  const dy = Math.abs(((y % B) + B) % B);
  const nearV = dx < half || dx > B - half;
  const nearH = dy < half || dy > B - half;
  return nearV || nearH;
}

export function circleHitsBuilding(world, x, y, r) {
  for (const b of world.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}

export function pointInBuilding(world, x, y) {
  for (const b of world.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

// Slide a circle along buildings: try full move, then x-only, then y-only.
export function moveCircle(world, ent, dx, dy, r) {
  const nx = ent.x + dx, ny = ent.y + dy;
  if (!circleHitsBuilding(world, nx, ny, r)) { ent.x = nx; ent.y = ny; return false; }
  let hit = true;
  if (!circleHitsBuilding(world, nx, ent.y, r)) { ent.x = nx; hit = false; }
  if (!circleHitsBuilding(world, ent.x, ny, r)) { ent.y = ny; hit = false; }
  return hit;
}

export function clampWorld(v) {
  return Math.max(8, Math.min(WORLD.size - 8, v));
}

// Line of sight: sample the segment; blocked if any sample is inside a building.
export function lineOfSight(world, x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(2, Math.ceil(dist / 18));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointInBuilding(world, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
  }
  return true;
}

// Nearest road-centre point to (x,y): used to snap AI onto lanes.
export function nearestRoadPoint(x, y) {
  const B = WORLD.block;
  const gx = Math.round(x / B) * B, gy = Math.round(y / B) * B;
  // Choose whichever grid line (vertical or horizontal) is closer.
  if (Math.abs(x - gx) < Math.abs(y - gy)) return { x: gx, y, vertical: true };
  return { x, y: gy, vertical: false };
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}
