// World rendering: sun-soaked Palmera City from above. Long sunset shadows
// fall to the south-east; the sea animates on the east edge. Only the camera
// viewport is drawn — off-screen lots are skipped.
import { WORLD, PALETTE } from './config.js';

export function drawWorld(ctx, G, viewW, viewH) {
  const cam = G.camera;
  const t = G.time;
  // Sea + sand base, then land.
  ctx.fillStyle = PALETTE.seaDeep;
  ctx.fillRect(0, 0, viewW, viewH);
  const seaScreenX = WORLD.seaX - cam.x;
  ctx.fillStyle = PALETTE.sea;
  if (seaScreenX < viewW) ctx.fillRect(Math.max(0, seaScreenX), 0, viewW, viewH);
  // Animated foam lines.
  ctx.strokeStyle = PALETTE.foam;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 14; i++) {
    const fy = ((i * 233 + Math.sin(t * 0.7 + i) * 8 - cam.y) % (WORLD.size)) ;
    const y = ((fy % viewH) + viewH) % viewH;
    const x = seaScreenX + 14 + Math.sin(t * 1.3 + i * 1.7) * 10;
    if (x > -40 && x < viewW) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 46, y + 4); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  const sandX = WORLD.beachX - cam.x;
  ctx.fillStyle = PALETTE.sand;
  if (sandX < viewW) ctx.fillRect(Math.max(0, sandX), 0, Math.max(0, seaScreenX - sandX), viewH);
  // Land base (sidewalk tone) then roads.
  ctx.fillStyle = PALETTE.sidewalk;
  ctx.fillRect(0, 0, Math.min(viewW, sandX), viewH);
  drawRoads(ctx, G, viewW, viewH);
  // Parks.
  for (const park of G.world.parks) {
    const x = park.x - cam.x, y = park.y - cam.y;
    if (x + park.w > 0 && y + park.h > 0 && x < viewW && y < viewH) {
      ctx.fillStyle = PALETTE.grass;
      ctx.fillRect(x, y, park.w, park.h);
      ctx.fillStyle = PALETTE.grassDark;
      ctx.fillRect(x + 8, y + 8, park.w - 16, 10);
    }
  }
  // Building shadows first, then bodies with window grids.
  ctx.fillStyle = PALETTE.shadow;
  for (const b of G.world.buildings) {
    const x = b.x - cam.x, y = b.y - cam.y;
    if (x + b.w < -40 || y + b.h < -40 || x > viewW + 40 || y > viewH + 40) continue;
    ctx.fillRect(x + 16, y + 20, b.w, b.h);
  }
  for (const b of G.world.buildings) {
    const x = b.x - cam.x, y = b.y - cam.y;
    if (x + b.w < 0 || y + b.h < 0 || x > viewW || y > viewH) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x, y, b.w, 7);
    ctx.strokeStyle = 'rgba(60,20,40,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, b.w - 2, b.h - 2);
    // Window grid — lit windows in a seeded pattern.
    const cols = Math.max(2, Math.floor(b.w / 26));
    const rows = Math.max(2, Math.floor(b.h / 26));
    for (let cx = 0; cx < cols; cx++) {
      for (let ry = 0; ry < rows; ry++) {
        const lit = ((b.seed >> ((cx * 3 + ry * 5) % 16)) & 1) === 1;
        ctx.fillStyle = lit ? 'rgba(255,214,120,0.85)' : 'rgba(40,50,80,0.5)';
        ctx.fillRect(x + 8 + cx * ((b.w - 14) / cols), y + 10 + ry * ((b.h - 16) / rows), 9, 11);
      }
    }
  }
  // Palms.
  for (const palm of G.world.palms) {
    const x = palm.x - cam.x, y = palm.y - cam.y;
    if (x < -30 || y < -30 || x > viewW + 30 || y > viewH + 30) continue;
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath(); ctx.ellipse(x + 10, y + 12, 15 * palm.s, 6 * palm.s, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = PALETTE.palmTrunk;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x + 2, y - 2); ctx.stroke();
    ctx.strokeStyle = PALETTE.palmLeaf;
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.sin(t * 1.4 + palm.x) * 0.08;
      ctx.beginPath();
      ctx.moveTo(x + 2, y - 2);
      ctx.lineTo(x + 2 + Math.cos(a) * 15 * palm.s, y - 2 + Math.sin(a) * 11 * palm.s);
      ctx.stroke();
    }
  }
  drawMissionMarker(ctx, G, viewW, viewH);
  drawPeds(ctx, G, viewW, viewH);
  drawCars(ctx, G, viewW, viewH);
  drawPlayer(ctx, G);
  // Bullets + muzzle handled as bright streaks.
  ctx.strokeStyle = '#ffe66d';
  ctx.lineWidth = 2;
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - cam.x, b.y - cam.y);
    ctx.lineTo(b.x - cam.x - b.vx * 0.016, b.y - cam.y - b.vy * 0.016);
    ctx.stroke();
  }
}

function drawRoads(ctx, G, viewW, viewH) {
  const cam = G.camera;
  const B = WORLD.block, R = WORLD.road;
  ctx.fillStyle = PALETTE.road;
  const startGX = Math.max(0, Math.floor(cam.x / B) - 1);
  const startGY = Math.max(0, Math.floor(cam.y / B) - 1);
  for (let gx = startGX; gx * B < cam.x + viewW + B; gx++) {
    const x = gx * B - R / 2 - cam.x;
    if (gx * B > WORLD.beachX + R) break;
    ctx.fillRect(x, -cam.y % B - B, R, viewH + B * 2);
  }
  for (let gy = startGY; gy * B < cam.y + viewH + B; gy++) {
    const y = gy * B - R / 2 - cam.y;
    ctx.fillRect(-cam.x % B - B, y, Math.min(viewW + B * 2, WORLD.beachX - cam.x + B), R);
  }
  // Lane dashes.
  ctx.fillStyle = PALETTE.lane;
  ctx.globalAlpha = 0.75;
  for (let gx = startGX; gx * B < cam.x + viewW + B; gx++) {
    const cx = gx * B - cam.x;
    if (gx * B > WORLD.beachX) break;
    for (let y = -((cam.y % 44) + 44) % 44; y < viewH; y += 44) ctx.fillRect(cx - 2, y, 4, 24);
  }
  for (let gy = startGY; gy * B < cam.y + viewH + B; gy++) {
    const cy = gy * B - cam.y;
    for (let x = -((cam.x % 44) + 44) % 44; x < Math.min(viewW, WORLD.beachX - cam.x); x += 44) ctx.fillRect(x, cy - 2, 24, 4);
  }
  ctx.globalAlpha = 1;
}

function drawMissionMarker(ctx, G, viewW, viewH) {
  const cur = G.currentMission ? G.currentMission() : null;
  if (!cur || G.screen !== 'play') return;
  const cam = G.camera;
  const x = cur.x - cam.x, y = cur.y - cam.y;
  const pulse = 1 + Math.sin(G.time * 4) * 0.16;
  ctx.strokeStyle = '#ffd60a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, 26 * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,214,10,0.2)';
  ctx.beginPath(); ctx.arc(x, y, 26 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▼', x, y - 34 - Math.sin(G.time * 4) * 4);
  // Off-screen direction arrow at the viewport edge.
  if (x < 0 || y < 0 || x > viewW || y > viewH) {
    const cx = Math.max(28, Math.min(viewW - 28, x));
    const cy = Math.max(28, Math.min(viewH - 28, y));
    const a = Math.atan2(y - viewH / 2, x - viewW / 2);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawPeds(ctx, G, viewW, viewH) {
  const cam = G.camera;
  for (const ped of G.peds) {
    const x = ped.x - cam.x, y = ped.y - cam.y;
    if (x < -20 || y < -20 || x > viewW + 20 || y > viewH + 20) continue;
    ctx.fillStyle = PALETTE.shadow;
    ctx.beginPath(); ctx.ellipse(x + 4, y + 6, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    if (ped.down) {
      ctx.fillStyle = ped.shirt;
      ctx.fillRect(x - 11, y - 4, 22, 8);
      ctx.fillStyle = ped.skin;
      ctx.beginPath(); ctx.arc(x + 13, y, 5, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    const legSwing = Math.sin(ped.legPhase) * 5;
    ctx.strokeStyle = '#2d3142';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + 3); ctx.lineTo(x + legSwing * 0.5, y + 10);
    ctx.moveTo(x, y + 3); ctx.lineTo(x - legSwing * 0.5, y + 10);
    ctx.stroke();
    ctx.fillStyle = ped.shirt;
    ctx.beginPath(); ctx.arc(x, y, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath(); ctx.arc(x + Math.cos(ped.angle) * 2, y + Math.sin(ped.angle) * 2, 4.4, 0, Math.PI * 2); ctx.fill();
    if (ped.state === 'flee') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', x, y - 12);
    }
  }
}

export function drawCarShape(ctx, car, x, y, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(car.angle);
  ctx.fillStyle = PALETTE.shadow;
  ctx.fillRect(-18 + 6, -9 + 8, 40, 20);
  ctx.fillStyle = car.cop ? '#eef2ff' : car.color;
  ctx.beginPath();
  ctx.roundRect(-22, -11, 44, 22, 6);
  ctx.fill();
  if (car.cop) {
    ctx.fillStyle = '#2b4bd8';
    ctx.fillRect(-8, -11, 15, 22);
    const flash = Math.sin((t || 0) * 9 + car.sirenPhase) > 0;
    ctx.fillStyle = flash ? '#ff3b30' : '#3b82f6';
    ctx.fillRect(-3, -6, 6, 12);
  } else {
    ctx.fillStyle = 'rgba(20,24,40,0.75)';
    ctx.fillRect(2, -8, 10, 16);   // windshield
    ctx.fillRect(-14, -8, 7, 16);  // rear window
  }
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(20, -9, 3, 5);
  ctx.fillRect(20, 4, 3, 5);
  ctx.fillStyle = '#ff5d5d';
  ctx.fillRect(-23, -9, 3, 5);
  ctx.fillRect(-23, 4, 3, 5);
  if (car.health < 45) {
    ctx.fillStyle = 'rgba(40,40,40,0.5)';
    ctx.beginPath(); ctx.arc(-6, 0, 7 + Math.sin((t || 0) * 6) * 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawCars(ctx, G, viewW, viewH) {
  const cam = G.camera;
  for (const car of G.cars) {
    const x = car.x - cam.x, y = car.y - cam.y;
    if (x < -50 || y < -50 || x > viewW + 50 || y > viewH + 50) continue;
    if (G.player.car === car) continue; // drawn with the player pass for the hero tint
    drawCarShape(ctx, car, x, y, G.time);
  }
}

function drawPlayer(ctx, G) {
  const cam = G.camera;
  const p = G.player;
  if (p.car) {
    drawCarShape(ctx, p.car, p.car.x - cam.x, p.car.y - cam.y, G.time);
    return;
  }
  const x = p.x - cam.x, y = p.y - cam.y;
  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath(); ctx.ellipse(x + 5, y + 7, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
  const legSwing = p.moving ? Math.sin(p.walkPhase) * 6 : 0;
  ctx.strokeStyle = '#26324d';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y + 3); ctx.lineTo(x + legSwing * 0.6, y + 12);
  ctx.moveTo(x, y + 3); ctx.lineTo(x - legSwing * 0.6, y + 12);
  ctx.stroke();
  ctx.fillStyle = PALETTE.hero;
  ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd9b3';
  ctx.beginPath(); ctx.arc(x + Math.cos(p.angle) * 3, y + Math.sin(p.angle) * 3, 5.4, 0, Math.PI * 2); ctx.fill();
  // Gun arm toward aim.
  ctx.strokeStyle = '#ffd9b3';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(p.angle) * 13, y + Math.sin(p.angle) * 13);
  ctx.stroke();
  ctx.fillStyle = '#22252d';
  ctx.fillRect(x + Math.cos(p.angle) * 12 - 2, y + Math.sin(p.angle) * 12 - 2, 6, 4);
  if (p.muzzle > 0) {
    ctx.fillStyle = 'rgba(255,220,90,0.9)';
    ctx.beginPath();
    ctx.arc(x + Math.cos(p.angle) * 20, y + Math.sin(p.angle) * 20, 5 * p.muzzle + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Name tag.
  ctx.fillStyle = 'rgba(20,16,30,0.65)';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RICO', x, y - 18);
}
