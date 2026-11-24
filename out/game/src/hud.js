// HUD and screens: health, cash, wanted stars, objective, banner, bust meter — plus the
// minimap, drawn on its own small canvas in the corner (streets, player, police, mission).
import { FONT, WORLD } from './config.js';
import { roads, SEA_Y } from './world.js';

export function drawMinimap(mm, game) {
  const c = mm.getContext('2d'), W = mm.width, H = mm.height, s = W / WORLD.size;
  c.fillStyle = '#e8d9b0'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#4c9950'; c.fillRect(500 * s, 500 * s, 390 * s, 390 * s); c.fillRect(2000 * s, 1500 * s, 390 * s, 390 * s);
  c.fillStyle = '#f2d492'; c.fillRect(0, (SEA_Y - 120) * s, W, 120 * s);
  c.fillStyle = '#1b8a9c'; c.fillRect(0, SEA_Y * s, W, H - SEA_Y * s);
  c.strokeStyle = '#57505e'; c.lineWidth = Math.max(2, WORLD.roadWidth * s * 0.62);
  for (const r of roads) { c.beginPath(); if (r.axis === 'x') { c.moveTo(0, r.at * s); c.lineTo(W, r.at * s); } else { c.moveTo(r.at * s, 0); c.lineTo(r.at * s, H); } c.stroke(); }
  const dot = (x, y, col, r) => { c.fillStyle = col; c.beginPath(); c.arc(x * s, y * s, r, 0, 6.29); c.fill(); };
  for (const car of game.police.cars) dot(car.x, car.y, (Math.floor(performance.now() / 400) % 2 ? '#ff3b30' : '#2f7bff'), 4);
  if (game.marker) { dot(game.marker.x, game.marker.y, '#ffd60a', 5); c.strokeStyle = '#ffd60a'; c.beginPath(); c.arc(game.marker.x * s, game.marker.y * s, 8 + Math.sin(performance.now() / 300) * 2, 0, 6.29); c.stroke(); }
  const p = game.player; dot(p.x, p.y, '#ffffff', 5); c.strokeStyle = '#ff8c1a'; c.lineWidth = 2; c.beginPath(); c.arc(p.x * s, p.y * s, 7, 0, 6.29); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 2; c.strokeRect(1, 1, W - 2, H - 2);
}

export function drawHud(ctx, game, vw, vh) {
  const p = game.player;
  ctx.textBaseline = 'alphabetic';
  // top-left panel: health + cash
  ctx.fillStyle = 'rgba(20,16,24,0.62)'; ctx.beginPath(); ctx.roundRect(14, 14, 252, 74, 10); ctx.fill();
  ctx.fillStyle = '#ff5d5d'; ctx.fillRect(26, 30, 160, 13); ctx.fillStyle = '#59d977'; ctx.fillRect(26, 30, 160 * Math.max(0, p.health) / 100, 13);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.strokeRect(26, 30, 160, 13);
  ctx.font = `bold 15px ${FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText('RICO SOL', 26, 24 + 40);
  ctx.font = `bold 24px ${FONT}`; ctx.fillStyle = '#ffd60a'; ctx.textAlign = 'right'; ctx.fillText('$' + game.cash, 254, 62);
  // wanted stars top-right
  ctx.font = '30px ' + FONT; ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i < game.wanted ? '#ffd60a' : 'rgba(255,255,255,0.25)'; ctx.fillText('★', vw - 18 - (4 - i) * 30, 46); }
  if (game.police.bustT > 0.1) { ctx.fillStyle = 'rgba(20,16,24,0.62)'; ctx.fillRect(vw - 190, 58, 170, 12); ctx.fillStyle = '#ff5040'; ctx.fillRect(vw - 190, 58, 170 * Math.min(1, game.police.bustT / 2.6), 12); ctx.font = `bold 12px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText('BUSTED?', vw - 20, 84); }
  // objective bar bottom-centre
  const obj = game.objective;
  ctx.font = `bold 17px ${FONT}`; const w = Math.min(vw - 40, ctx.measureText(obj).width + 44);
  ctx.fillStyle = 'rgba(20,16,24,0.66)'; ctx.beginPath(); ctx.roundRect((vw - w) / 2, vh - 52, w, 36, 9); ctx.fill();
  ctx.fillStyle = '#ffe9a8'; ctx.textAlign = 'center'; ctx.fillText('▸ ' + obj, vw / 2, vh - 28);
  if (game.marker) { const d = Math.round(Math.hypot(game.marker.x - p.x, game.marker.y - p.y) / 10); ctx.font = `bold 13px ${FONT}`; ctx.fillStyle = '#ffd60a'; ctx.fillText(d + 'm', vw / 2, vh - 62); }
  // story banner
  if (game.missions.bannerT > 0) {
    ctx.font = `bold 20px ${FONT}`; const bw = Math.min(vw - 60, ctx.measureText(game.missions.banner).width + 48);
    ctx.fillStyle = 'rgba(120,40,10,0.82)'; ctx.beginPath(); ctx.roundRect((vw - bw) / 2, 96, bw, 42, 10); ctx.fill();
    ctx.fillStyle = '#fff3d6'; ctx.textAlign = 'center'; ctx.fillText(game.missions.banner, vw / 2, 124);
  }
  if (p.car) { ctx.font = `bold 13px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.textAlign = 'left'; ctx.fillText('E — exit car', 16, vh - 20); }
  else { ctx.font = `bold 13px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.textAlign = 'left'; ctx.fillText('WASD move · Shift sprint · E enter car · Click shoot', 16, vh - 20); }
}

export function drawOverlay(ctx, game, vw, vh, screen) {
  ctx.textAlign = 'center';
  if (screen === 'title') {
    const g = ctx.createLinearGradient(0, 0, 0, vh); g.addColorStop(0, 'rgba(30,10,40,0.25)'); g.addColorStop(1, 'rgba(30,10,40,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
    ctx.font = `900 84px ${FONT}`; ctx.fillStyle = '#ffd60a'; ctx.strokeStyle = '#7a1f3d'; ctx.lineWidth = 10;
    ctx.strokeText('PALMERA HEAT', vw / 2, vh * 0.34); ctx.fillText('PALMERA HEAT', vw / 2, vh * 0.34);
    ctx.font = `bold 24px ${FONT}`; ctx.fillStyle = '#ffe9a8'; ctx.fillText('One courier. One city. One long sunset.', vw / 2, vh * 0.34 + 44);
    ctx.font = `20px ${FONT}`; ctx.fillStyle = '#fff';
    ctx.fillText('Click or press Enter to play — WASD drive & walk, E enter car, mouse aim, click shoot, Esc pause', vw / 2, vh * 0.34 + 92);
    ctx.font = `16px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillText('An original game set in fictional Palmera City', vw / 2, vh * 0.34 + 122);
  } else if (screen === 'paused') {
    ctx.fillStyle = 'rgba(15,10,20,0.6)'; ctx.fillRect(0, 0, vw, vh);
    ctx.font = `900 52px ${FONT}`; ctx.fillStyle = '#ffd60a'; ctx.fillText('PAUSED', vw / 2, vh / 2);
    ctx.font = `19px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText('Esc / P to resume', vw / 2, vh / 2 + 40);
  } else if (screen === 'busted' || screen === 'wasted') {
    ctx.fillStyle = screen === 'busted' ? 'rgba(20,30,90,0.55)' : 'rgba(90,10,10,0.55)'; ctx.fillRect(0, 0, vw, vh);
    ctx.font = `900 72px ${FONT}`; ctx.fillStyle = screen === 'busted' ? '#7db4ff' : '#ff6b5e';
    ctx.fillText(screen === 'busted' ? 'BUSTED' : 'WASTED', vw / 2, vh * 0.42);
    ctx.font = `20px ${FONT}`; ctx.fillStyle = '#fff';
    ctx.fillText(screen === 'busted' ? 'The Palmera PD finally caught Rico. Fine: $200.' : 'Rico wakes up at Palmera General. Bill: $150.', vw / 2, vh * 0.42 + 44);
    ctx.fillText('Click or press Enter to keep playing', vw / 2, vh * 0.42 + 78);
  }
}
