// Police: cruisers spawn at the city edge in proportion to the wanted level, pursue and ram
// the player, and give up the search when the player stays hidden long enough.
import { WORLD, WANTED_DECAY } from './config.js';
import { makeCar } from './traffic.js';
import { lineOfSight } from './world.js';

export function createPoliceState() { return { cars: [], hiddenT: 0, bustT: 0 }; }

export function wantedFor(crime, current) { return Math.min(5, Math.max(current, crime)); }

export function updatePolice(state, dt, game) {
  const { player, wanted } = game;
  const target = player.car ? { x: player.car.x, y: player.car.y } : player;
  const wantCount = wanted === 0 ? 0 : wanted + 1;
  // spawn at a road point away from the player
  if (state.cars.length < wantCount && Math.random() < dt * 1.5) {
    const spots = [[250, 250], [2750, 250], [250, 2250], [2750, 2250], [1500, 250], [250, 1500], [2750, 1500]];
    const s = spots[Math.floor(Math.random() * spots.length)];
    if (Math.hypot(s.x - target.x, s.y - target.y) > 420) state.cars.push(makeCar(s.x, s.y, 0, '#f5f5f5', { police: true, cruise: 999 }));
  }
  if (state.cars.length > wantCount + 2) state.cars.splice(0, state.cars.length - wantCount - 2);
  let seesPlayer = false, nearest = 1e9;
  for (const c of state.cars) {
    const dx = target.x - c.x, dy = target.y - c.y, dist = Math.hypot(dx, dy); nearest = Math.min(nearest, dist);
    const sees = dist < 430 && lineOfSight(game.city, c.x, c.y, target.x, target.y);
    if (sees) seesPlayer = true;
    const goal = sees || state.lastKnown ? (sees ? target : state.lastKnown) : null;
    if (!goal) { c.speed = Math.max(0, c.speed - 120 * dt); continue; }
    const want = Math.atan2(goal.y - c.y, goal.x - c.x);
    let diff = want - c.angle; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
    const top = player.car ? 500 : 300;
    c.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff)) * (c.speed > 30 ? 1 : 2.2);
    const wantSpeed = dist > 60 ? top : top * 0.45;
    c.speed += Math.max(-380 * dt, Math.min(240 * dt, wantSpeed - c.speed));
    c.x += Math.cos(c.angle) * c.speed * dt; c.y += Math.sin(c.angle) * c.speed * dt;
    c.x = Math.max(24, Math.min(WORLD.size - 24, c.x)); c.y = Math.max(24, Math.min(WORLD.size - 24, c.y));
  }
  if (seesPlayer) { state.lastKnown = { ...target }; state.hiddenT = 0; } else if (wanted > 0) {
    state.hiddenT += dt;
    if (state.hiddenT > WANTED_DECAY) { state.hiddenT = 0; game.setWanted(wanted - 1); if (wanted - 1 === 0) state.lastKnown = null; }
  }
  // bust: a cruiser staying right on a slow / on-foot player fills the bust meter
  const playerSpeed = player.car ? Math.abs(player.car.speed) : (player.moving ? 150 : 0);
  if (wanted > 0 && nearest < 95 && playerSpeed < 55) state.bustT += dt; else state.bustT = Math.max(0, state.bustT - dt * 1.6);
  if (state.bustT > 2.6) { state.bustT = 0; return 'busted'; }
  return null;
}
