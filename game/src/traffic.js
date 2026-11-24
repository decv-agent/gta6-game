// Traffic: civilian cars cruise the grid in right-hand lanes, brake for the
// car ahead and pick a new heading at intersections. Parked cars sit waiting
// to be borrowed. Cars are plain objects shared with the player system.
import { WORLD, CAR_COLORS } from './config.js';
import { pick, range } from './random.js';
import { circleHitsBuilding } from './world.js';

let nextId = 1;

export function makeCar(x, y, angle, color, opts) {
  return {
    id: nextId++, x, y, angle, speed: 0, color,
    parked: !!(opts && opts.parked),
    cop: !!(opts && opts.cop),
    health: 100, driver: !(opts && opts.parked),
    cruise: (opts && opts.cruise) || 150,
    turnCooldown: 0, stuck: 0, sirenPhase: Math.random() * 6,
  };
}

// Lane offset: drive on the right side of the road centre line.
const LANE = 23;

export function spawnTraffic(world, rng, count) {
  const cars = [];
  let guard = 0;
  while (cars.length < count && guard++ < 600) {
    const vertical = rng() < 0.5;
    const line = Math.floor(range(rng, 0, 8)) * WORLD.block;
    const along = range(rng, 80, WORLD.size - 80);
    const dir = rng() < 0.5 ? 1 : -1;
    let x, y, angle;
    if (vertical) { x = line + dir * LANE; y = along; angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { x = along; y = line + (dir > 0 ? -LANE : LANE); angle = dir > 0 ? 0 : Math.PI; }
    if (x >= WORLD.beachX - 40) continue;
    if (circleHitsBuilding(world, x, y, 20)) continue;
    if (cars.some((c) => Math.hypot(c.x - x, c.y - y) < 90)) continue;
    const car = makeCar(x, y, angle, pick(rng, CAR_COLORS), { cruise: range(rng, 120, 185) });
    car.speed = car.cruise * 0.8;
    cars.push(car);
  }
  return cars;
}

export function spawnParked(world, rng, count) {
  const cars = [];
  let guard = 0;
  while (cars.length < count && guard++ < 600) {
    const vertical = rng() < 0.5;
    const line = Math.floor(range(rng, 0, 8)) * WORLD.block;
    const along = range(rng, 60, WORLD.size - 60);
    const side = rng() < 0.5 ? 1 : -1;
    let x, y, angle;
    if (vertical) { x = line + side * (WORLD.road / 2 - 14); y = along; angle = side > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { x = along; y = line + side * (WORLD.road / 2 - 14); angle = side > 0 ? Math.PI : 0; }
    if (x >= WORLD.beachX - 30) continue;
    if (circleHitsBuilding(world, x, y, 20)) continue;
    if (cars.some((c) => Math.hypot(c.x - x, c.y - y) < 70)) continue;
    cars.push(makeCar(x, y, angle, pick(rng, CAR_COLORS), { parked: true }));
  }
  return cars;
}

function nearestIntersection(x, y) {
  const B = WORLD.block;
  return { x: Math.round(x / B) * B, y: Math.round(y / B) * B };
}

export function updateTrafficCar(G, car, dt) {
  if (car.parked || car.cop || car === G.player.car) return;
  const world = G.world;
  car.turnCooldown -= dt;
  // Sensor: anything solid ahead?
  const fx = car.x + Math.cos(car.angle) * 52;
  const fy = car.y + Math.sin(car.angle) * 52;
  let blocked = !!circleHitsBuilding(world, fx, fy, 14);
  for (const other of G.cars) {
    if (other === car) continue;
    if (Math.hypot(other.x - fx, other.y - fy) < 34) { blocked = true; break; }
  }
  if (!blocked && Math.hypot(G.player.x - fx, G.player.y - fy) < 30 && !G.player.car) blocked = true;
  if (!blocked) for (const p of G.peds) {
    if (!p.down && Math.hypot(p.x - fx, p.y - fy) < 26) { blocked = true; break; }
  }
  const target = blocked ? 0 : car.cruise;
  car.speed += Math.max(-320 * dt, Math.min(170 * dt, target - car.speed));
  if (Math.abs(car.speed) < 4 && blocked) car.stuck += dt; else car.stuck = 0;

  // At an intersection, maybe turn (keeps the car on the grid forever).
  const inter = nearestIntersection(car.x, car.y);
  const dInter = Math.hypot(car.x - inter.x, car.y - inter.y);
  if (dInter < 26 && car.turnCooldown <= 0) {
    car.turnCooldown = 1.2;
    const r = G.rng();
    if (r < 0.42) {
      // Turn left or right: rotate heading by 90 degrees.
      car.angle += (r < 0.21 ? -Math.PI / 2 : Math.PI / 2);
    }
  }
  // Gently steer back toward the lane line of the current heading.
  const B = WORLD.block;
  const snapV = Math.round(car.x / B) * B;
  const snapH = Math.round(car.y / B) * B;
  const vertical = Math.abs(Math.sin(car.angle)) > 0.7;
  const horizontal = Math.abs(Math.cos(car.angle)) > 0.7;
  let steer = 0;
  if (vertical) {
    const dir = Math.sin(car.angle) > 0 ? 1 : -1;
    const laneX = snapV + dir * LANE;
    steer = Math.max(-0.9, Math.min(0.9, (laneX - car.x) * 0.012));
    car.angle += steer * dt * 2.2;
  } else if (horizontal) {
    const dir = Math.cos(car.angle) > 0 ? 1 : -1;
    const laneY = snapH + (dir > 0 ? -LANE : LANE);
    steer = Math.max(-0.9, Math.min(0.9, (laneY - car.y) * 0.012));
    car.angle += steer * dt * 2.2;
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!circleHitsBuilding(world, nx, ny, 15)) { car.x = nx; car.y = ny; }
  else { car.speed = 0; car.angle += 0.6 * dt; }
  car.x = Math.max(20, Math.min(WORLD.beachX - 30, car.x));
  car.y = Math.max(20, Math.min(WORLD.size - 20, car.y));
  // Recycle cars that drift too far from the action.
  if (Math.hypot(car.x - G.player.x, car.y - G.player.y) > 1500) {
    const fresh = spawnTraffic(world, G.rng, 1)[0];
    if (fresh) { car.x = fresh.x; car.y = fresh.y; car.angle = fresh.angle; car.speed = fresh.speed; }
  }
}
