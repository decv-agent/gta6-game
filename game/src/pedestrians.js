// Pedestrians stroll the sidewalks, panic when danger is near, and fall when
// a car or bullet reaches them. Falling is a crime — the wanted system hears
// about it through the game state flags set here.
import { WORLD } from './config.js';
import { pick, range } from './random.js';
import { moveCircle, onRoad } from './world.js';

const SHIRTS = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#f78c6b', '#c8b6ff', '#ffffff', '#84a98c'];
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

export function spawnPeds(G, count) {
  const peds = [];
  let guard = 0;
  while (peds.length < count && guard++ < 900) {
    const x = range(G.rng, 60, WORLD.beachX - 40);
    const y = range(G.rng, 60, WORLD.size - 60);
    if (onRoad(x, y)) continue; // sidewalks and lots only
    peds.push({
      x, y, angle: G.rng() * Math.PI * 2, speed: 0,
      walkSpeed: range(G.rng, 34, 62), state: 'walk', timer: range(G.rng, 1, 5),
      down: false, downTimer: 0, shirt: pick(G.rng, SHIRTS), skin: pick(G.rng, SKIN),
      legPhase: G.rng() * 6,
    });
  }
  return peds;
}

export function updatePed(G, ped, dt) {
  if (ped.down) {
    ped.downTimer -= dt;
    if (ped.downTimer <= 0) { // get up and run home (recycle near player)
      ped.down = false;
      ped.state = 'flee';
      ped.timer = 2;
    }
    return;
  }
  ped.timer -= dt;
  // Danger sense: gunfire, fast cars, police sirens nearby.
  let danger = null;
  if (G.lastShotAt && G.time - G.lastShotAt < 1.2) {
    if (Math.hypot(ped.x - G.player.x, ped.y - G.player.y) < 320) danger = G.player;
  }
  if (!danger) {
    for (const c of G.cars) {
      if (Math.abs(c.speed) > 200 && Math.hypot(ped.x - c.x, ped.y - c.y) < 130) { danger = c; break; }
    }
  }
  if (danger && ped.state !== 'flee') { ped.state = 'flee'; ped.timer = range(G.rng, 1.4, 2.6); }
  if (ped.state === 'flee') {
    const src = danger || G.player;
    ped.angle = Math.atan2(ped.y - src.y, ped.x - src.x) + range(G.rng, -0.3, 0.3);
    ped.speed = 148;
    if (ped.timer <= 0) ped.state = 'walk';
  } else {
    ped.speed = ped.walkSpeed;
    if (ped.timer <= 0) {
      ped.timer = range(G.rng, 2, 6);
      ped.angle = Math.floor(G.rng() * 4) * (Math.PI / 2) + range(G.rng, -0.3, 0.3);
    }
  }
  ped.legPhase += dt * (ped.speed > 100 ? 13 : 8);
  const dx = Math.cos(ped.angle) * ped.speed * dt;
  const dy = Math.sin(ped.angle) * ped.speed * dt;
  if (moveCircle(G.world, ped, dx, dy, 9)) ped.angle += Math.PI * 0.75; // bounce off walls
  ped.x = Math.max(14, Math.min(WORLD.size - 14, ped.x));
  ped.y = Math.max(14, Math.min(WORLD.size - 14, ped.y));
  // Recycle far-away peds to somewhere near the player.
  if (Math.hypot(ped.x - G.player.x, ped.y - G.player.y) > 1100) {
    ped.x = G.player.x + range(G.rng, -520, 520);
    ped.y = G.player.y + range(G.rng, -520, 520);
    ped.x = Math.max(20, Math.min(WORLD.beachX - 30, ped.x));
    ped.y = Math.max(20, Math.min(WORLD.size - 20, ped.y));
  }
}

export function knockDown(G, ped, byPlayer) {
  if (ped.down) return;
  ped.down = true;
  ped.downTimer = range(G.rng, 3.5, 6);
  ped.speed = 0;
  if (byPlayer) G.commitCrime('pedHit');
}
