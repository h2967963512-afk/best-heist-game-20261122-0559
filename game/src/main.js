// The Velvet Heist: browser shell. Owns the loop, the screens and the
// sounds; the rules live in world.js, the drawing in render.js.

import { BEST_KEY, FIELD, FONT, PALETTE, STEP } from './config.js';
import { LEVELS } from './levels.js';
import { createAudio } from './audio.js';
import { createInput, endFrame } from './input.js';
import { drawHud, drawWorld } from './render.js';
import { runShot } from './shots.js';
import { createWorld, respawnPlayer, stepWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const audio = createAudio();
const input = createInput(canvas);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = FIELD.width * dpr;
  canvas.height = FIELD.height * dpr;
  // Letterbox: keep the 16:9 field undistorted whatever the window's shape.
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  const w = Math.floor(FIELD.width * scale);
  const h = Math.floor(FIELD.height * scale);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.style.left = `${Math.floor((window.innerWidth - w) / 2)}px`;
  canvas.style.top = `${Math.floor((window.innerHeight - h) / 2)}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

let screen = 'title';
let state = createWorld(0);

// A tiny debug handle for playtesting (and for anyone curious in the
// console): read-only access to the current world and screen.
window.__heist = {
  get state() { return state; },
  get screen() { return screen; },
};
let best = 0;
try { best = Number(window.localStorage.getItem(BEST_KEY) || 0) || 0; } catch { best = 0; }

function saveBest() {
  if (state.score > best) {
    best = state.score;
    try { window.localStorage.setItem(BEST_KEY, String(best)); } catch { /* private mode */ }
  }
}

function panel(x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function centerText(text, y, font, colour) {
  ctx.font = font;
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.fillText(text, FIELD.width / 2, y);
}

function drawTitle() {
  drawWorld(ctx, state);
  ctx.fillStyle = 'rgba(8, 10, 18, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(FIELD.width / 2 - 330, 110, 660, 420);
  centerText('THE VELVET HEIST', 180, `bold 52px ${FONT}`, PALETTE.gold);
  centerText('Three rooms. Three crews of guards. One clean getaway.', 218, `18px ${FONT}`, PALETTE.text);
  centerText('Lift the loot, crack the safes, stay out of the cones.', 246, `16px ${FONT}`, PALETTE.muted);
  centerText('WASD / arrows — move      Shift — sneak (slow, quiet)', 300, `15px ${FONT}`, PALETTE.text);
  centerText('Space — dash (fast, loud)      Click — toss a coin to lure a guard', 326, `15px ${FONT}`, PALETTE.text);
  centerText('Hold E — pick a lock · crack a safe · cut the cameras', 352, `15px ${FONT}`, PALETTE.text);
  centerText('Fill the loot quota, then slip out the green exit.', 378, `15px ${FONT}`, PALETTE.text);
  centerText('If the alarm hits 100, the whole floor locks down.', 404, `15px ${FONT}`, PALETTE.alarmHigh);
  centerText('1 · The Gilded Gallery      2 · The Vault Floor      3 · The Penthouse Safe', 446, `14px ${FONT}`, PALETTE.muted);
  centerText('Press ENTER to start the job', 500, `bold 18px ${FONT}`, PALETTE.gold);
  if (best > 0) centerText(`Best take so far: $${best}`, 530 - 8, `14px ${FONT}`, PALETTE.muted);
  ctx.textAlign = 'left';
}

function drawPaused() {
  drawWorld(ctx, state);
  drawHud(ctx, state);
  ctx.fillStyle = 'rgba(8, 10, 18, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  centerText('PAUSED', 330, `bold 44px ${FONT}`, PALETTE.text);
  centerText('Press P to keep stealing', 372, `16px ${FONT}`, PALETTE.muted);
  ctx.textAlign = 'left';
}

function drawCaught() {
  drawWorld(ctx, state);
  drawHud(ctx, state);
  ctx.fillStyle = 'rgba(60, 8, 8, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(FIELD.width / 2 - 300, 240, 600, 180);
  centerText('CAUGHT!', 300, `bold 44px ${FONT}`, PALETTE.alarmHigh);
  centerText(state.statusReason, 340, `16px ${FONT}`, PALETTE.text);
  centerText(`${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left — the crew pulls you out.`, 372, `15px ${FONT}`, PALETTE.muted);
  centerText('Press ENTER to go back in', 402, `bold 16px ${FONT}`, PALETTE.gold);
  ctx.textAlign = 'left';
}

function drawCleared() {
  drawWorld(ctx, state);
  drawHud(ctx, state);
  ctx.fillStyle = 'rgba(8, 20, 12, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(FIELD.width / 2 - 300, 220, 600, 220);
  centerText('CLEAN GETAWAY', 280, `bold 40px ${FONT}`, PALETTE.exit);
  centerText(`${LEVELS[state.levelIndex].name} — cleared`, 320, `18px ${FONT}`, PALETTE.text);
  centerText(`Loot $${state.lootValue}   Level score +${state.levelScore}${state.ghost ? '   (never seen: ghost bonus!)' : ''}`, 354, `16px ${FONT}`, PALETTE.gold);
  centerText(`Total score ${state.score}`, 384, `16px ${FONT}`, PALETTE.text);
  const next = state.levelIndex + 1 < LEVELS.length
    ? `Press ENTER — next: ${LEVELS[state.levelIndex + 1].name}`
    : 'Press ENTER — the final take';
  centerText(next, 416, `bold 16px ${FONT}`, PALETTE.gold);
  ctx.textAlign = 'left';
}

function drawVictory() {
  drawWorld(ctx, state);
  ctx.fillStyle = 'rgba(8, 10, 18, 0.75)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(FIELD.width / 2 - 330, 170, 660, 320);
  centerText('THE VELVET HEIST — COMPLETE', 240, `bold 38px ${FONT}`, PALETTE.gold);
  centerText('Three rooms emptied. No alarms that mattered. The crew retires.', 282, `17px ${FONT}`, PALETTE.text);
  centerText(`Final take: $${state.score}`, 330, `bold 26px ${FONT}`, PALETTE.gold);
  centerText(`Best take: $${best}`, 366, `16px ${FONT}`, PALETTE.muted);
  centerText('Press ENTER to run it all again', 430, `bold 16px ${FONT}`, PALETTE.text);
  ctx.textAlign = 'left';
}

function drawFailed() {
  drawWorld(ctx, state);
  ctx.fillStyle = 'rgba(40, 6, 6, 0.7)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(FIELD.width / 2 - 300, 240, 600, 190);
  centerText('BUSTED', 300, `bold 44px ${FONT}`, PALETTE.alarmHigh);
  centerText(state.statusReason, 340, `16px ${FONT}`, PALETTE.text);
  centerText(`Final score ${state.score} — best $${best}`, 372, `15px ${FONT}`, PALETTE.muted);
  centerText('Press ENTER to plan the next job', 406, `bold 16px ${FONT}`, PALETTE.gold);
  ctx.textAlign = 'left';
}

function handleEvents(events) {
  for (const event of events) {
    if (event.type === 'loot') audio.loot();
    else if (event.type === 'safe') audio.safe();
    else if (event.type === 'door') audio.door();
    else if (event.type === 'coin') audio.coin();
    else if (event.type === 'dash') audio.dash();
    else if (event.type === 'spotted') audio.spotted();
    else if (event.type === 'caught') audio.caught();
    else if (event.type === 'lockdown') audio.lockdown();
    else if (event.type === 'cleared') audio.clear();
  }
}

function startLevel(index) {
  state = createWorld(index, state.lives, state.score, state.coins);
  screen = 'playing';
}

function advance() {
  if (state.levelIndex + 1 < LEVELS.length) {
    startLevel(state.levelIndex + 1);
  } else {
    saveBest();
    audio.victory();
    screen = 'victory';
  }
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

// --- Screenshot mode: render one driven scene and stop. ---
if (shotName) {
  const { state: shotState, overlay } = runShot(shotName);
  state = shotState;
  drawWorld(ctx, state);
  drawHud(ctx, state);
  if (overlay === 'cleared') drawCleared();
  document.title = `The Velvet Heist — ${shotName}`;
  setStatus(`Screenshot scene ${shotName}: ${LEVELS[state.levelIndex].name}, alarm ${Math.round(state.alarm)}, loot $${state.lootValue}.`);
} else {
  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    accumulator += elapsed;

    if (input.paused && screen === 'playing') screen = 'paused';
    else if (!input.paused && screen === 'paused') screen = 'playing';

    if (screen === 'title') {
      if (input.enterPressed || input.anyKey) {
        audio.unlock();
        state = createWorld(0);
        screen = 'playing';
        setStatus('The job is on. Stay out of the cones.');
      }
      drawTitle();
    } else if (screen === 'playing') {
      let guard = 0;
      while (accumulator >= STEP && guard < 8) {
        const events = stepWorld(state, input, STEP);
        handleEvents(events);
        endFrame(input);
        accumulator -= STEP;
        guard += 1;
        if (state.status === 'caught') { screen = 'caught'; break; }
        if (state.status === 'cleared') { screen = 'cleared'; break; }
        if (state.status === 'failed') { saveBest(); screen = 'failed'; break; }
      }
      drawWorld(ctx, state);
      drawHud(ctx, state);
      if (state.lockdownTimer > 0) {
        centerText('⚠ LOCKDOWN — STAY OUT OF SIGHT ⚠', 90, `bold 22px ${FONT}`, PALETTE.alarmHigh);
        ctx.textAlign = 'left';
      }
    } else if (screen === 'paused') {
      drawPaused();
    } else if (screen === 'caught') {
      if (input.enterPressed) {
        audio.unlock();
        respawnPlayer(state);
        screen = 'playing';
        setStatus('Back in. Quieter this time.');
      }
      drawCaught();
    } else if (screen === 'cleared') {
      if (input.enterPressed) advance();
      drawCleared();
    } else if (screen === 'victory') {
      if (input.enterPressed) {
        state = createWorld(0);
        screen = 'playing';
      }
      drawVictory();
    } else if (screen === 'failed') {
      if (input.enterPressed) {
        state = createWorld(0);
        screen = 'playing';
      }
      drawFailed();
    }
    endFrame(input);
  }
  requestAnimationFrame(frame);
}
