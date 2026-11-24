// The story of Rico Sol, a courier who owes the Marisol family one last favour.
// A chain of three missions told through banners and objective text, then free-roam errands.
export const STORY = [
  { title: 'Sunset Pickup', banner: 'Marisol left a package by the north park. Go get it, Rico.',
    objective: 'Pick up the package at Palmera Park', x: 760, y: 760, reward: 250, crime: 0 },
  { title: 'Hot Delivery', banner: 'Every cop in Palmera just heard your name. Deliver it to the beach club!',
    objective: 'Deliver the package to the Beach Club', x: 2280, y: 2380, reward: 600, crime: 2 },
  { title: 'Vanish at the Pier', banner: 'Drop the heat. Reach the old pier and disappear into the sunset.',
    objective: 'Reach the getaway pier — lose the cops or just get there', x: 420, y: 2470, reward: 1000, crime: 0 },
];
export function createMissions(saved = 0) {
  return { index: Math.min(saved, STORY.length), banner: '', bannerT: 0, done: saved >= STORY.length, failed: '' };
}
export function currentObjective(m) {
  if (m.done) return 'Free roam — cause a little sunshine, or press R for an errand run';
  return STORY[m.index].objective;
}
export function currentMarker(m) { return m.done ? null : { x: STORY[m.index].x, y: STORY[m.index].y }; }
export function startMission(m) { const s = STORY[m.index]; m.banner = s.banner; m.bannerT = 6; return s; }
export function updateMissions(m, dt, game) {
  if (m.bannerT > 0) m.bannerT -= dt;
  if (m.done) return null;
  const s = STORY[m.index], p = game.playerPos();
  if (Math.hypot(p.x - s.x, p.y - s.y) < 62) {
    game.addCash(s.reward); if (s.crime) game.raiseWanted(s.crime);
    m.index += 1;
    if (m.index >= STORY.length) { m.done = true; m.banner = 'Story complete! Palmera City is yours, Rico. +$' + s.reward; m.bannerT = 7; game.save(); return 'story-done'; }
    const next = startMission(m); m.banner = `+$${s.reward} — ${next.title}. ${next.banner}`; m.bannerT = 6; game.save();
    return 'mission';
  }
  return null;
}
