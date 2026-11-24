// Rico Sol's story: three linked courier jobs across Palmera City, then
// free-roam. Each mission is a target point, banner text and a reward; the
// chain advances when the player reaches the glowing marker.
import { WORLD } from './config.js';

export const MISSIONS = [
  {
    id: 'pickup',
    title: 'SUNSET PICKUP',
    brief: 'Pick up the package at the marina kiosk, east side.',
    objective: 'Reach the package at the marina',
    x: 2480, y: 420, reward: 250, radius: 46,
  },
  {
    id: 'delivery',
    title: 'HOT DELIVERY',
    brief: 'The buyer is impatient — and the PD just got a tip-off.',
    objective: 'Deliver the package downtown — lose the heat if you can',
    x: 640, y: 1520, reward: 600, radius: 46, heatOnStart: 2,
  },
  {
    id: 'vanish',
    title: 'VANISH AT THE PIER',
    brief: 'Ditch the noise. Lie low at the south pier until things cool.',
    objective: 'Reach the south pier hideout',
    x: 2560, y: 2720, reward: 900, radius: 52,
  },
];

export function createMissionState(saved) {
  return {
    index: saved && Number.isInteger(saved.mission) ? Math.min(saved.mission, MISSIONS.length) : 0,
    banner: null, bannerTimer: 0,
    complete: false,
  };
}

export function currentMission(G) {
  const m = G.missions;
  if (m.index >= MISSIONS.length) return null;
  return MISSIONS[m.index];
}

export function startMissionBanner(G) {
  const cur = currentMission(G);
  if (!cur) return;
  G.missions.banner = cur;
  G.missions.bannerTimer = 3.6;
  if (cur.heatOnStart) {
    for (let i = 0; i < cur.heatOnStart; i++) G.commitCrime('copHit');
  }
}

export function updateMissions(G, dt) {
  const m = G.missions;
  if (m.bannerTimer > 0) m.bannerTimer -= dt;
  const cur = currentMission(G);
  if (!cur || G.screen !== 'play') return;
  const px = G.player.car ? G.player.car.x : G.player.x;
  const py = G.player.car ? G.player.car.y : G.player.y;
  const d = Math.hypot(px - cur.x, py - cur.y);
  if (d < cur.radius) {
    G.cash += cur.reward;
    G.audio.cash();
    G.flashMessage(`+$${cur.reward} — ${cur.title} complete`);
    m.index += 1;
    if (m.index >= MISSIONS.length) {
      m.complete = true;
      G.flashMessage('Story complete — Palmera City is yours. Press R to replay.');
    } else {
      startMissionBanner(G);
    }
    G.saveGame();
  }
}

export function missionDistance(G) {
  const cur = currentMission(G);
  if (!cur) return null;
  const px = G.player.car ? G.player.car.x : G.player.x;
  const py = G.player.car ? G.player.car.y : G.player.y;
  return Math.round(Math.hypot(px - cur.x, py - cur.y));
}

// A beach hideout point used by the finale; exported for the minimap legend.
export const PIER = { x: 2560, y: 2720 };
export const WORLD_EDGE = WORLD.size;
