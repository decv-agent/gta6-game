// Keyboard + mouse state. Held keys are polled; one-shot presses are queued
// so a tap between frames is never lost.
export function createInput() {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false };

  window.addEventListener('keydown', (e) => {
    if (!e.repeat) pressed.add(e.code);
    held.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => { held.clear(); mouse.down = false; });
  window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mousedown', (e) => { if (e.button === 0) mouse.down = true; });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });

  return {
    held, mouse,
    down(...codes) { return codes.some((c) => held.has(c)); },
    justPressed(...codes) { return codes.some((c) => pressed.has(c)); },
    endFrame() { pressed.clear(); },
  };
}
