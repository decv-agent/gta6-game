// Rico Sol on foot and behind the wheel, plus gunfire. Driving is weighty:
// acceleration, braking, drag and steering that fades with speed. Crashes
// cost car health, player health and wanted heat.
import { PLAYER, CAR, WORLD } from './config.js';
import { moveCircle, circleHitsBuilding, clampWorld } from './world.js';
import { knockDown } from './pedestrians.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, health: PLAYER.maxHealth, car: null,
    moving: false, walkPhase: 0, fireCooldown: 0, muzzle: 0, dead: false,
  };
}

export function nearestCar(G, maxDist) {
  let best = null, bestD = maxDist;
  for (const c of G.cars) {
    if (c.cop && Math.abs(c.speed) > 30) continue;
    const d = Math.hypot(c.x - G.player.x, c.y - G.player.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function tryEnterExit(G) {
  const p = G.player;
  if (p.car) {
    // Step out beside the car if there is room.
    const sx = p.car.x + Math.cos(p.car.angle + Math.PI / 2) * 30;
    const sy = p.car.y + Math.sin(p.car.angle + Math.PI / 2) * 30;
    if (!circleHitsBuilding(G.world, sx, sy, PLAYER.radius)) { p.x = sx; p.y = sy; }
    else { p.x = p.car.x; p.y = p.car.y; }
    p.car.driver = false;
    p.car = null;
    return;
  }
  const car = nearestCar(G, 52);
  if (car) {
    const wasParked = car.parked;
    car.parked = false;
    car.driver = true;
    p.car = car;
    p.x = car.x; p.y = car.y;
    if (wasParked) G.commitCrime('theft');
    G.audio.pickup();
  }
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const input = G.input;
  p.fireCooldown -= dt;
  p.muzzle = Math.max(0, p.muzzle - dt * 9);
  if (input.justPressed('KeyE', 'KeyF')) tryEnterExit(G);

  if (p.car) { updateDriving(G, dt); return; }

  let mx = 0, my = 0;
  if (input.down('KeyW', 'ArrowUp')) my -= 1;
  if (input.down('KeyS', 'ArrowDown')) my += 1;
  if (input.down('KeyA', 'ArrowLeft')) mx -= 1;
  if (input.down('KeyD', 'ArrowRight')) mx += 1;
  const len = Math.hypot(mx, my);
  p.moving = len > 0;
  if (len > 0) {
    mx /= len; my /= len;
    const sprint = input.down('ShiftLeft', 'ShiftRight');
    const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    p.angle = Math.atan2(my, mx);
    p.walkPhase += dt * (sprint ? 13 : 9);
    moveCircle(G.world, p, mx * speed * dt, my * speed * dt, PLAYER.radius);
    p.x = clampWorld(p.x); p.y = clampWorld(p.y);
    if (p.x > WORLD.seaX + 60) p.x = WORLD.seaX + 60; // Rico does not swim
  }
  // Aim follows the mouse (screen -> world via camera).
  const wx = G.camera.x + input.mouse.x;
  const wy = G.camera.y + input.mouse.y;
  if (!p.moving) p.angle = Math.atan2(wy - p.y, wx - p.x);
  else if (input.mouse.down) p.angle = Math.atan2(wy - p.y, wx - p.x);

  // Collisions with moving traffic hurt.
  for (const c of G.cars) {
    if (Math.abs(c.speed) > 130 && Math.hypot(c.x - p.x, c.y - p.y) < 30) {
      damagePlayer(G, Math.min(26, Math.abs(c.speed) * 0.06), c);
      const push = Math.atan2(p.y - c.y, p.x - c.x);
      moveCircle(G.world, p, Math.cos(push) * 26, Math.sin(push) * 26, PLAYER.radius);
    }
  }
  // Shooting.
  if (input.mouse.down && p.fireCooldown <= 0) shoot(G, wx, wy);
}

function shoot(G, wx, wy) {
  const p = G.player;
  p.fireCooldown = 0.16;
  p.muzzle = 1;
  G.lastShotAt = G.time;
  G.audio.shoot();
  const angle = Math.atan2(wy - p.y, wx - p.x) + (G.rng() - 0.5) * 0.035;
  G.bullets.push({ x: p.x + Math.cos(angle) * 18, y: p.y + Math.sin(angle) * 18, vx: Math.cos(angle) * 980, vy: Math.sin(angle) * 980, life: 0.55 });
  G.commitCrime('shot');
}

export function updateBullets(G, dt) {
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && circleHitsBuilding(G.world, b.x, b.y, 2)) { dead = true; G.audio.hit(); }
    if (!dead) {
      for (const ped of G.peds) {
        if (!ped.down && Math.hypot(ped.x - b.x, ped.y - b.y) < 13) { knockDown(G, ped, true); dead = true; break; }
      }
    }
    if (!dead) {
      for (const c of G.cars) {
        if (Math.hypot(c.x - b.x, c.y - b.y) < 24) {
          c.health -= 14;
          if (c.cop) G.commitCrime('copHit');
          G.audio.hit();
          dead = true; break;
        }
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
}

function updateDriving(G, dt) {
  const p = G.player;
  const car = p.car;
  const input = G.input;
  const fwd = input.down('KeyW', 'ArrowUp');
  const back = input.down('KeyS', 'ArrowDown');
  const left = input.down('KeyA', 'ArrowLeft');
  const right = input.down('KeyD', 'ArrowRight');
  if (fwd) car.speed += CAR.accel * dt;
  if (back) {
    if (car.speed > 12) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.reverse * dt;
  }
  car.speed -= car.speed * CAR.drag * dt;
  if (!fwd && !back) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 26 * dt);
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  const steerInput = (right ? 1 : 0) - (left ? 1 : 0);
  const speedRatio = Math.abs(car.speed) / CAR.maxSpeed;
  const steerRate = 2.1 * (1 - speedRatio * 0.55);
  if (Math.abs(car.speed) > 4) {
    car.angle += steerInput * steerRate * dt * Math.sign(car.speed);
  }
  p.moving = Math.abs(car.speed) > 6;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hit = circleHitsBuilding(G.world, nx, ny, 16);
  if (!hit) { car.x = nx; car.y = ny; }
  else {
    crashInto(G, car, Math.abs(car.speed));
    car.speed *= -0.22;
  }
  car.x = Math.max(16, Math.min(WORLD.size - 16, car.x));
  car.y = Math.max(16, Math.min(WORLD.size - 16, car.y));
  p.x = car.x; p.y = car.y; p.angle = car.angle;
  G.audio.setEngine(car.speed / CAR.maxSpeed, true);

  // Car vs car and car vs ped.
  for (const other of G.cars) {
    if (other === car) continue;
    const d = Math.hypot(other.x - car.x, other.y - car.y);
    if (d < 40 && d > 0.01) {
      const push = Math.atan2(other.y - car.y, other.x - car.x);
      const overlap = (40 - d) / 2;
      other.x += Math.cos(push) * overlap; other.y += Math.sin(push) * overlap;
      if (Math.abs(car.speed) > 90) {
        other.health -= Math.abs(car.speed) * 0.05;
        crashInto(G, car, Math.abs(car.speed) * 0.5);
        G.commitCrime(other.cop ? 'copHit' : 'carHit');
        car.speed *= 0.55;
      }
    }
  }
  for (const ped of G.peds) {
    if (!ped.down && Math.abs(car.speed) > 26 && Math.hypot(ped.x - car.x, ped.y - car.y) < 27) {
      knockDown(G, ped, true);
    }
  }
}

function crashInto(G, car, speed) {
  if (speed < 60) return;
  const dmg = (speed - 50) * 0.055;
  car.health -= dmg;
  damagePlayer(G, dmg * 0.45, null);
  G.audio.crash(speed);
  G.shake = Math.min(9, speed * 0.02);
  G.commitCrime('crash');
}

export function damagePlayer(G, amount, source) {
  const p = G.player;
  if (p.dead || G.screen !== 'play') return;
  p.health -= amount;
  G.hurtFlash = 0.5;
  if (source && source.cop) G.commitCrime('copHit');
  if (p.health <= 0) { p.health = 0; p.dead = true; G.triggerWasted(); }
}

// Police ramming: called from main when a cruiser overlaps the player.
export function policeContact(G, dt) {
  const p = G.player;
  for (const c of G.cars) {
    if (!c.cop) continue;
    const px = p.car ? p.car.x : p.x, py = p.car ? p.car.y : p.y;
    if (Math.hypot(c.x - px, c.y - py) < 42 && Math.abs(c.speed) > 120) {
      if (p.car) { p.car.health -= 22 * dt; p.car.speed *= 0.985; }
      else damagePlayer(G, 9 * dt, c);
    }
  }
}
