// Rico Sol: walking, sprinting, entering cars, weighty driving, shooting and taking damage.
import { PLAYER, CAR } from './config.js';
import { collideCircle, hitsBuilding, SEA_Y } from './world.js';

export function createPlayer(x = 560, y = 560) {
  return { x, y, angle: -Math.PI / 2, health: PLAYER.health, car: null, moving: false, fireT: 0, hurtT: 0, walkPhase: 0 };
}
export function enterExitCar(p, cars, onSteal) {
  if (p.car) { // step out beside the car
    const c = p.car; p.car = null; c.playerDriven = false; c.parked = true; c.speed = 0;
    p.x = c.x - Math.sin(c.angle) * 30; p.y = c.y + Math.cos(c.angle) * 30; return 'exit';
  }
  let best = null, bd = 64;
  for (const c of cars) { if (c.dead) continue; const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } }
  if (best) {
    const wasParked = best.parked; best.parked = false; best.playerDriven = true; p.car = best;
    if (wasParked || !best.police) onSteal?.(best); return 'enter';
  }
  return null;
}
export function updatePlayerOnFoot(p, dt, input, city, demoDir) {
  const v = demoDir || input.moveVec();
  const sprint = input.down('ShiftLeft', 'ShiftRight');
  p.moving = v.active;
  if (v.active) {
    const sp = sprint ? PLAYER.sprint : PLAYER.walk;
    p.angle = Math.atan2(v.y, v.x); p.walkPhase += dt * (sprint ? 13 : 9);
    const fixed = collideCircle(city, p.x + v.x * sp * dt, p.y + v.y * sp * dt, PLAYER.radius);
    p.x = fixed.x; p.y = Math.min(fixed.y, SEA_Y + 46); // wading at the shoreline is fine
  }
  if (p.fireT > 0) p.fireT -= dt; if (p.hurtT > 0) p.hurtT -= dt;
}
export function updatePlayerCar(p, dt, input, city, audio) {
  const c = p.car; if (!c) return null;
  const up = input.down('KeyW', 'ArrowUp'), down = input.down('KeyS', 'ArrowDown');
  const steer = (input.down('KeyA', 'ArrowLeft') ? -1 : 0) + (input.down('KeyD', 'ArrowRight') ? 1 : 0);
  if (up) c.speed += CAR.accel * dt * (c.speed < 0 ? 2.2 : 1);
  else if (down) c.speed -= (c.speed > 10 ? CAR.brake : CAR.accel * 0.7) * dt;
  else c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 60 * dt); // engine drag
  c.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, c.speed));
  if (Math.abs(c.speed) > 4) c.angle += steer * CAR.turn * dt * (Math.abs(c.speed) / CAR.maxSpeed) * (c.speed < 0 ? -1 : 1) * 1.6;
  const nx = c.x + Math.cos(c.angle) * c.speed * dt, ny = c.y + Math.sin(c.angle) * c.speed * dt;
  const hit = hitsBuilding(city, nx, ny, 24);
  if (hit) { if (Math.abs(c.speed) > 150) { audio?.crash(); p.health -= 6; } c.speed *= -0.25; }
  else { c.x = Math.max(24, Math.min(2976, nx)); c.y = Math.max(24, Math.min(2976, ny)); }
  p.x = c.x; p.y = c.y;
  if (p.fireT > 0) p.fireT -= dt; if (p.hurtT > 0) p.hurtT -= dt;
  return c;
}
