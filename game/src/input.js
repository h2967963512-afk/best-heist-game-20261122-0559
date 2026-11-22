// Keyboard and mouse for The Velvet Heist. WASD or arrows to move, Shift to
// sneak, Space to dash, E (held) to interact, click to toss a coin that
// lures a guard, P to pause, Enter to start or continue.

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    moveX: 0,
    moveY: 0,
    sneak: false,
    interact: false,
    dash: false,
    coin: null,
    paused: false,
    enterPressed: false,
    anyKey: false,
  };

  function updateMove() {
    let x = 0;
    let y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    input.moveX = x;
    input.moveY = y;
    input.sneak = keys.has('ShiftLeft') || keys.has('ShiftRight');
    input.interact = keys.has('KeyE');
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    input.anyKey = true;
    if (event.code === 'Space') {
      input.dash = true;
      event.preventDefault();
    }
    if (event.code === 'Enter') input.enterPressed = true;
    if (event.code === 'KeyP') input.paused = !input.paused;
    keys.add(event.code);
    updateMove();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    updateMove();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    updateMove();
  });

  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    input.coin = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  });

  return input;
}

/** Clear the one-frame flags after the step has consumed them. */
export function endFrame(input) {
  input.dash = false;
  input.coin = null;
  input.enterPressed = false;
}
