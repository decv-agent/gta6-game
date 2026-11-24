// Traffic AI: civilian cars that cruise the road grid, keep a lane, brake for cars ahead,
// and turn at intersections. Parked cars sit at curbs waiting to be stolen.
import { WORLD } from './config.js';
import { roads } from './world.js';
import { createRandom } from './random.js';

const COLORS = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#f78c6b', '#c8b6ff', '#ffffff', '#8ecae6'];
const LANE = 26;

export function makeCar(x, y, angle, color, opts = {}) {
  return { x, y, angle, speed: 0, color, w: 44, h: 22, parked: !!opts.parked, police: !!opts.police, dead: false, honk: 0, ...opts };
}
function lanePoint(r, along, dir) {
  // dir +1 travels toward increasing coordinate, lane offset keeps right-hand traffic
  return r.axis === 'x' ? { x: along, y: r.at + dir * LANE, angle: dir > 0 ? 0 : Math.PI } : { x: r.at - dir * LANE, y: along, angle: dir > 0 ? Math.PI / 2 : -Math.PI / 2 };
}

export function createTraffic(seed = 21) {
  const rnd = createRandom(seed); const cars = [];
  for (let i = 0; i < 15; i++) {
    const r = roads[Math.floor(rnd() * roads.length)], dir = rnd() < 0.5 ? 1 : -1, along = 120 + rnd() * (WORLD.size - 240);
    const p = lanePoint(r, along, dir);
    cars.push(makeCar(p.x, p.y, p.angle, COLORS[i % COLORS.length], { road: r, dir, cruise: 130 + rnd() * 90 }));
  }
  // parked cars near curbs on a few streets
  const parkedSpots = [[420, 700], [760, 1180], [1250, 420], [1780, 760], [2240, 1250], [700, 1760], [1300, 2240], [1980, 1980], [480, 2280], [2350, 480]];
  parkedSpots.forEach(([x, y], i) => cars.push(makeCar(x, y, i % 2 ? 0 : Math.PI / 2, COLORS[(i + 3) % COLORS.length], { parked: true })));
  return cars;
}

export function updateTraffic(cars, dt, obstacles) {
  for (const c of cars) {
    if (c.parked || c.dead || c.playerDriven) continue;
    let want = c.cruise;
    // brake for anything ahead
    const fx = Math.cos(c.angle), fy = Math.sin(c.angle);
    for (const o of obstacles) {
      if (o === c) continue; const dx = o.x - c.x, dy = o.y - c.y, ahead = dx * fx + dy * fy, side = Math.abs(-dx * fy + dy * fx);
      if (ahead > 0 && ahead < 78 && side < 24) { want = Math.min(want, ahead < 44 ? 0 : c.cruise * 0.4); break; }
    }
    c.speed += Math.max(-260 * dt, Math.min(140 * dt, want - c.speed));
    c.x += fx * c.speed * dt; c.y += fy * c.speed * dt;
    // at an intersection, sometimes turn onto the crossing road
    for (const r of roads) {
      const cross = r.axis !== (c.road.axis);
      if (!cross) continue;
      const along = c.road.axis === 'x' ? c.y : c.x, crossAt = r.at;
      const myAlong = c.road.axis === 'x' ? c.x : c.y;
      if (Math.abs(myAlong - crossAt) < 6 && Math.abs(along - c.road.at) < WORLD.roadWidth) {
        if (Math.random() < 0.35) {
          const dir = Math.random() < 0.5 ? 1 : -1, p = lanePoint(r, c.road.axis === 'x' ? c.y : c.x, dir);
          c.road = r; c.dir = dir; c.x = p.x; c.y = p.y; c.angle = p.angle;
        }
        break;
      }
    }
    if (c.x < 30 || c.x > WORLD.size - 30 || c.y < 30 || c.y > WORLD.size - 30) { c.angle += Math.PI; c.x = Math.max(40, Math.min(WORLD.size - 40, c.x)); c.y = Math.max(40, Math.min(WORLD.size - 40, c.y)); }
  }
}
