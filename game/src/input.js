// Keyboard + mouse input: held movement keys, one-shot actions, mouse position and firing.
export function createInput(canvas) {
  const keys = new Set(); let actions = new Set();
  const mouse = { x: 0, y: 0, down: false };
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!e.repeat && !keys.has(e.code)) actions.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });
  canvas.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  canvas.addEventListener('pointerdown', (e) => { mouse.down = true; actions.add('Pointer'); canvas.focus?.(); });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  return {
    keys, mouse,
    down: (...codes) => codes.some((c) => keys.has(c)),
    take: (code) => { const had = actions.has(code); actions.delete(code); return had; },
    anyAction: () => { const had = actions.size > 0; actions.clear(); return had; },
    moveVec() {
      let x = 0, y = 0;
      if (this.down('KeyA', 'ArrowLeft')) x -= 1; if (this.down('KeyD', 'ArrowRight')) x += 1;
      if (this.down('KeyW', 'ArrowUp')) y -= 1; if (this.down('KeyS', 'ArrowDown')) y += 1;
      const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l, active: x !== 0 || y !== 0 };
    },
  };
}
