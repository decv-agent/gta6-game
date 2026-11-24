// HUD overlay (drawn on the main canvas) plus the live minimap (its own
// small canvas in the corner). Health, cash, stars, objective, bust meter,
// banners, messages — everything the player reads at a glance.
import { WORLD, PALETTE } from './config.js';
import { currentMission, missionDistance } from './missions.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function bar(ctx, x, y, w, h, ratio, fill, back) {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, Math.max(0, Math.min(w, w * ratio)), h);
}

export function drawHud(ctx, G, viewW, viewH) {
  const p = G.player;
  ctx.textBaseline = 'alphabetic';
  // Top-left: health + cash.
  ctx.fillStyle = 'rgba(18,14,28,0.55)';
  ctx.beginPath(); ctx.roundRect(14, 14, 218, 74, 10); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('HEALTH', 26, 36);
  bar(ctx, 26, 42, 140, 12, p.health / 100, p.health > 30 ? '#4ade80' : '#ef4444', 'rgba(255,255,255,0.18)');
  if (p.car) {
    ctx.fillText('CAR', 26, 70);
    bar(ctx, 62, 60, 104, 10, Math.max(0, p.car.health) / 100, '#fbbf24', 'rgba(255,255,255,0.18)');
  }
  ctx.fillStyle = '#ffd60a';
  ctx.font = `bold 19px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('$' + G.cash, 222, 38);
  // Top-right: wanted stars.
  ctx.font = '26px ' + FONT;
  ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted.stars ? '#ffd60a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', viewW - 20 - (4 - i) * 30, 42);
  }
  if (G.wanted.stars > 0 && !G.wanted.seen) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `12px ${FONT}`;
    ctx.fillText('HIDDEN — heat cooling', viewW - 20, 62);
  }
  // Objective bar, top centre.
  const cur = currentMission(G);
  if (cur && G.screen === 'play') {
    const dist = missionDistance(G);
    const label = `${cur.objective}  •  ${dist}m`;
    ctx.font = `bold 14px ${FONT}`;
    const w = ctx.measureText(label).width + 34;
    ctx.fillStyle = 'rgba(18,14,28,0.6)';
    ctx.beginPath(); ctx.roundRect((viewW - w) / 2, 14, w, 34, 9); ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'center';
    ctx.fillText(label, viewW / 2, 37);
  }
  // Bust meter under the stars.
  if (G.bust > 0.02) {
    ctx.fillStyle = '#fff';
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText('BUSTED?', viewW - 126, 84);
    bar(ctx, viewW - 116, 74, 100, 11, G.bust, '#ef4444', 'rgba(255,255,255,0.2)');
  }
  // Context prompt: enter car / replay.
  ctx.textAlign = 'center';
  ctx.font = `bold 15px ${FONT}`;
  if (!p.car && G.nearCar && G.screen === 'play') {
    ctx.fillStyle = 'rgba(18,14,28,0.6)';
    const label = 'Press E to drive';
    const w = ctx.measureText(label).width + 26;
    ctx.beginPath(); ctx.roundRect(viewW / 2 - w / 2, viewH - 92, w, 30, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(label, viewW / 2, viewH - 71);
  }
  if (G.missions.complete && G.screen === 'play') {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `13px ${FONT}`;
    ctx.fillText('Free roam — press R to replay the story', viewW / 2, viewH - 18);
  }
  // Story banner.
  const m = G.missions;
  if (m.banner && m.bannerTimer > 0) {
    const a = Math.min(1, m.bannerTimer / 0.6, (3.6 - m.bannerTimer) / 0.4 + 0.2);
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.fillStyle = 'rgba(18,10,24,0.78)';
    ctx.fillRect(0, viewH * 0.16, viewW, 92);
    ctx.fillStyle = '#ffd60a';
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(m.banner.title, viewW / 2, viewH * 0.16 + 40);
    ctx.fillStyle = '#fff';
    ctx.font = `15px ${FONT}`;
    ctx.fillText(m.banner.brief, viewW / 2, viewH * 0.16 + 68);
    ctx.globalAlpha = 1;
  }
  // Toast message.
  if (G.message && G.messageTimer > 0) {
    ctx.globalAlpha = Math.min(1, G.messageTimer);
    ctx.fillStyle = 'rgba(18,14,28,0.7)';
    ctx.font = `bold 16px ${FONT}`;
    const w = ctx.measureText(G.message).width + 30;
    ctx.beginPath(); ctx.roundRect(viewW / 2 - w / 2, 60, w, 32, 8); ctx.fill();
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText(G.message, viewW / 2, 82);
    ctx.globalAlpha = 1;
  }
  // Hurt vignette.
  if (G.hurtFlash > 0) {
    ctx.fillStyle = `rgba(220,38,38,${(G.hurtFlash * 0.35).toFixed(3)})`;
    ctx.fillRect(0, 0, viewW, viewH);
  }
  drawMinimap(ctx, G, viewW, viewH);
}

export function drawMinimap(ctx, G, viewW, viewH) {
  const S = 168;
  const x0 = viewW - S - 16, y0 = viewH - S - 16;
  const scale = S / WORLD.size;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x0, y0, S, S, 10); ctx.clip();
  ctx.fillStyle = PALETTE.sidewalk;
  ctx.fillRect(x0, y0, S, S);
  // Roads.
  ctx.strokeStyle = PALETTE.road;
  ctx.lineWidth = Math.max(2, WORLD.road * scale);
  for (let i = 0; i * WORLD.block <= WORLD.size; i++) {
    const gx = x0 + i * WORLD.block * scale;
    ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx, y0 + S); ctx.stroke();
    const gy = y0 + i * WORLD.block * scale;
    ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x0 + S, gy); ctx.stroke();
  }
  // Parks + beach + sea.
  ctx.fillStyle = PALETTE.grass;
  for (const park of G.world.parks) {
    ctx.fillRect(x0 + park.x * scale, y0 + park.y * scale, park.w * scale, park.h * scale);
  }
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(x0 + WORLD.beachX * scale, y0, (WORLD.seaX - WORLD.beachX) * scale, S);
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(x0 + WORLD.seaX * scale, y0, S - WORLD.seaX * scale, S);
  const dot = (wx, wy, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x0 + wx * scale, y0 + wy * scale, r, 0, Math.PI * 2); ctx.fill();
  };
  // Police blink, mission marker pulses, player is a white-ringed hero dot.
  const cur = currentMission(G);
  if (cur && G.screen === 'play') {
    dot(cur.x, cur.y, '#ffd60a', 5 + Math.sin(G.time * 5) * 1.4);
  }
  if (Math.sin(G.time * 6) > -0.3) {
    for (const c of G.cars) if (c.cop) dot(c.x, c.y, '#3b82f6', 3);
  }
  const px = G.player.car ? G.player.car.x : G.player.x;
  const py = G.player.car ? G.player.car.y : G.player.y;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x0 + px * scale, y0 + py * scale, 5, 0, Math.PI * 2); ctx.stroke();
  dot(px, py, PALETTE.hero, 3.4);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x0, y0, S, S, 10); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `bold 10px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('PALMERA CITY', x0 + 8, y0 + 15);
}
