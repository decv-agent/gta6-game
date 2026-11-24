// Rendering: the sun-soaked city from above — long shadows, teal water, orange rooftops,
// palm crowns, cars with windscreens, people with shadows, and a sunset glow at the frame edge.
import { PALETTE, WORLD } from './config.js';
import { roads, SEA_Y } from './world.js';

export function drawCar(ctx, c, t) {
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
  ctx.fillStyle = 'rgba(60,30,10,0.30)'; ctx.fillRect(-c.w / 2 + 5, -c.h / 2 + 6, c.w, c.h); // shadow
  ctx.fillStyle = c.police ? '#f4f6f8' : c.color;
  ctx.beginPath(); ctx.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 6); ctx.fill();
  ctx.fillStyle = c.police ? '#1c2733' : 'rgba(20,30,40,0.85)';
  ctx.fillRect(-2, -c.h / 2 + 3, 12, c.h - 6); // windscreen
  ctx.fillRect(-c.w / 2 + 5, -c.h / 2 + 3, 8, c.h - 6); // rear window
  if (c.police) { ctx.fillStyle = (Math.floor(t * 3) % 2 ? '#ff3b30' : '#2f7bff'); ctx.fillRect(-4, -4, 9, 8); ctx.fillStyle = '#1c2733'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('POLICE', 0, -c.h / 2 - 3); }
  ctx.fillStyle = '#ffe9a8'; ctx.fillRect(c.w / 2 - 3, -c.h / 2 + 2, 3, 5); ctx.fillRect(c.w / 2 - 3, c.h / 2 - 7, 3, 5);
  ctx.restore();
}
function drawPalm(ctx, p) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.s, p.s);
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(3, 5); ctx.lineTo(0, 0); ctx.stroke();
  ctx.strokeStyle = '#2e8b57'; ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + p.x * 0.01; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a) * 11, Math.sin(a) * 11 - 3, Math.cos(a) * 17, Math.sin(a) * 17 + 4); ctx.stroke(); }
  ctx.restore();
}
export function drawWorld(ctx, game, cam, t, vw, vh) {
  const { city } = game;
  ctx.fillStyle = PALETTE.sidewalk; ctx.fillRect(0, 0, vw, vh);
  const x0 = cam.x - 40, y0 = cam.y - 40, x1 = cam.x + vw + 40, y1 = cam.y + vh + 40;
  for (const pk of city.parks) { ctx.fillStyle = PALETTE.park; ctx.fillRect(pk.x - cam.x, pk.y - cam.y, pk.w, pk.h); }
  // beach + sea
  ctx.fillStyle = PALETTE.sand; ctx.fillRect(0, SEA_Y - 120 - cam.y, vw, 130);
  const wg = ctx.createLinearGradient(0, SEA_Y - cam.y, 0, vh);
  wg.addColorStop(0, PALETTE.water); wg.addColorStop(1, PALETTE.waterDeep);
  ctx.fillStyle = wg; ctx.fillRect(0, SEA_Y - cam.y, vw, vh - (SEA_Y - cam.y));
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) { const wy = SEA_Y + 24 + i * 42 - cam.y; ctx.beginPath(); for (let x = -20; x < vw + 20; x += 26) ctx.lineTo(x, wy + Math.sin(x * 0.03 + t * 1.6 + i) * 3); ctx.stroke(); }
  // roads
  ctx.fillStyle = PALETTE.road;
  for (const r of roads) { if (r.axis === 'x') ctx.fillRect(0, r.at - WORLD.roadWidth / 2 - cam.y, vw, WORLD.roadWidth); else ctx.fillRect(r.at - WORLD.roadWidth / 2 - cam.x, 0, WORLD.roadWidth, vh); }
  ctx.strokeStyle = PALETTE.roadLine; ctx.lineWidth = 3; ctx.setLineDash([22, 18]);
  for (const r of roads) { ctx.beginPath(); if (r.axis === 'x') { ctx.moveTo(0, r.at - cam.y); ctx.lineTo(vw, r.at - cam.y); } else { ctx.moveTo(r.at - cam.x, 0); ctx.lineTo(r.at - cam.x, vh); } ctx.stroke(); }
  ctx.setLineDash([]);
  // buildings with long sunset shadows
  for (const b of city.buildings) {
    if (b.x > x1 || b.y > y1 || b.x + b.w < x0 || b.y + b.h < y0) continue;
    ctx.fillStyle = 'rgba(80,35,10,0.28)'; ctx.fillRect(b.x - cam.x + 14, b.y - cam.y + 16, b.w, b.h);
    ctx.fillStyle = b.roof; ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
    ctx.fillStyle = b.color; ctx.fillRect(b.x - cam.x + 6, b.y - cam.y + 6, b.w - 12, b.h - 12);
    ctx.fillStyle = 'rgba(255,240,200,0.5)';
    const cols = Math.floor(b.w / 34), rowsN = Math.floor(b.h / 34);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rowsN; j++) if ((i * 7 + j * 13 + b.floors) % 3) ctx.fillRect(b.x - cam.x + 14 + i * 34, b.y - cam.y + 14 + j * 34, 12, 8);
  }
  for (const p of city.palms) { if (p.x < x0 || p.y < y0 || p.x > x1 || p.y > y1) continue; ctx.save(); ctx.translate(-cam.x, -cam.y); drawPalm(ctx, p); ctx.restore(); }
  // mission marker beacon
  const mk = game.marker; if (mk) {
    const bob = Math.sin(t * 3) * 6;
    ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(mk.x - cam.x, mk.y - cam.y, 30 + bob * 0.4, 0, 6.29); ctx.stroke();
    ctx.fillStyle = '#ffd60a'; ctx.beginPath(); ctx.moveTo(mk.x - cam.x - 11, mk.y - cam.y - 52 + bob); ctx.lineTo(mk.x - cam.x + 11, mk.y - cam.y - 52 + bob); ctx.lineTo(mk.x - cam.x, mk.y - cam.y - 32 + bob); ctx.fill();
  }
  for (const c of game.allCars()) drawCar(ctx, { ...c, x: c.x - cam.x, y: c.y - cam.y }, t);
  for (const p of game.peds) {
    if (p.x < x0 || p.y < y0 || p.x > x1 || p.y > y1) continue;
    ctx.fillStyle = 'rgba(60,30,10,0.3)'; ctx.beginPath(); ctx.ellipse(p.x - cam.x + 4, p.y - cam.y + 5, 8, 5, 0, 0, 6.29); ctx.fill();
    if (p.dead) { ctx.fillStyle = p.shirt; ctx.save(); ctx.translate(p.x - cam.x, p.y - cam.y); ctx.rotate(p.angle); ctx.fillRect(-11, -4, 22, 8); ctx.restore(); continue; }
    const sw = Math.sin(p.walkA || 0) * 3;
    ctx.fillStyle = '#33415c'; ctx.fillRect(p.x - cam.x - 5, p.y - cam.y + 4 + sw * 0.3, 4, 6); ctx.fillRect(p.x - cam.x + 1, p.y - cam.y + 4 - sw * 0.3, 4, 6);
    ctx.fillStyle = p.shirt; ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, 8, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#f2c297'; ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y - 2, 4.4, 0, 6.29); ctx.fill();
  }
  // player
  const p = game.player;
  if (!p.car) {
    ctx.fillStyle = 'rgba(60,30,10,0.3)'; ctx.beginPath(); ctx.ellipse(p.x - cam.x + 4, p.y - cam.y + 6, 9, 6, 0, 0, 6.29); ctx.fill();
    ctx.fillStyle = p.hurtT > 0 ? '#ff5040' : '#ff8c1a'; ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, 12, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#ffe3b3'; ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y - 2, 5.5, 0, 6.29); ctx.fill();
    ctx.strokeStyle = '#22252b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x - cam.x, p.y - cam.y); ctx.lineTo(p.x - cam.x + Math.cos(p.angle) * 17, p.y - cam.y + Math.sin(p.angle) * 17); ctx.stroke();
    if (p.fireT > 0.05) { ctx.fillStyle = '#ffe45e'; ctx.beginPath(); ctx.arc(p.x - cam.x + Math.cos(p.angle) * 24, p.y - cam.y + Math.sin(p.angle) * 24, 7, 0, 6.29); ctx.fill(); }
  }
  for (const b of game.bullets) { ctx.fillStyle = '#fff3a0'; ctx.fillRect(b.x - cam.x - 3, b.y - cam.y - 1.5, 6, 3); }
  // sunset glow vignette
  const g = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.42, vw / 2, vh / 2, Math.max(vw, vh) * 0.78);
  g.addColorStop(0, 'rgba(255,140,60,0)'); g.addColorStop(1, 'rgba(255,110,40,0.20)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
}
