// Screenshot scenes for The Velvet Heist: a small autopilot plays the real
// game (the same stepWorld the player drives) and stops at a good frame.
// Nothing here fakes a state — every frame comes out of the simulation.

import { COLS, ROWS, STEP, TILE } from './config.js';
import { createWorld, hasLineOfSight, respawnPlayer, stepWorld } from './world.js';

const key = (c, r) => `${c},${r}`;

function tileOf(x, y) {
  return [Math.floor(x / TILE), Math.floor(y / TILE)];
}

function passable(state, c, r) {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
  const ch = state.level.def.map[r][c];
  return ch !== '#';
}

function coneDanger(state, c, r) {
  const { x, y } = { x: (c + 0.5) * TILE, y: (r + 0.5) * TILE };
  for (const guard of state.guards) {
    const d = Math.hypot(x - guard.x, y - guard.y);
    if (d > 300) continue;
    const to = Math.atan2(y - guard.y, x - guard.x);
    let diff = to - guard.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < 0.62 && hasLineOfSight(state.level, guard.x, guard.y, x, y)) return true;
  }
  if (state.blackoutTimer <= 0) {
    for (const cam of state.cameras) {
      const d = Math.hypot(x - cam.x, y - cam.y);
      if (d > 250) continue;
      const to = Math.atan2(y - cam.y, x - cam.x);
      let diff = to - cam.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < 0.5 && hasLineOfSight(state.level, cam.x, cam.y, x, y)) return true;
    }
  }
  return false;
}

function bfsPath(state, from, to, avoidCones) {
  const [sc, sr] = tileOf(from.x, from.y);
  const [gc, gr] = tileOf(to.x, to.y);
  const prev = new Map([[key(sc, sr), null]]);
  const cost = new Map([[key(sc, sr), 0]]);
  const queue = [[sc, sr]];
  while (queue.length) {
    // Cheapest-first: plain BFS is fine here, the grid is tiny.
    const [c, r] = queue.shift();
    if (c === gc && r === gr) {
      const path = [];
      let cur = key(c, r);
      while (cur) {
        const [pc, pr] = cur.split(',').map(Number);
        path.unshift({ x: (pc + 0.5) * TILE, y: (pr + 0.5) * TILE });
        cur = prev.get(cur);
      }
      return path;
    }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      const nk = key(nc, nr);
      if (prev.has(nk) || !passable(state, nc, nr)) continue;
      if (avoidCones && coneDanger(state, nc, nr) && !(nc === gc && nr === gr)) continue;
      prev.set(nk, key(c, r));
      queue.push([nc, nr]);
    }
  }
  return null;
}

function nearestLoot(state) {
  let best = null;
  let bestD = Infinity;
  for (const item of state.level.loot) {
    if (item.taken) continue;
    const d = Math.hypot(item.x - state.player.x, item.y - state.player.y);
    if (d < bestD) { best = item; bestD = d; }
  }
  return best;
}

/**
 * Drive one world with the autopilot. `mode` is 'stealth' (avoid cones,
 * sneak, pick locks) or 'bold' (straight at the loot, no sneak).
 * `stopWhen(state, steps)` decides when the scene is ready.
 * Returns the state at the stopping point.
 */
function drive(state, mode, stopWhen, maxSeconds = 150) {
  const maxSteps = Math.floor(maxSeconds / STEP);
  let path = null;
  let waypoint = 1;
  let replanIn = 0;
  let target = null;
  for (let step = 0; step < maxSteps; step += 1) {
    if (state.status === 'caught') {
      respawnPlayer(state);
      path = null;
      target = null;
      continue;
    }
    if (state.status !== 'playing') break;
    if (stopWhen(state, step)) break;
    replanIn -= 1;
    const needTarget = !target || (target.kind && target.taken) || (target.isExit && state.lootValue >= state.quota);
    if (needTarget || replanIn <= 0 || !path) {
      const wantExit = state.lootValue >= state.quota;
      target = wantExit ? { x: state.level.exit.x, y: state.level.exit.y, isExit: true }
        : nearestLoot(state);
      if (!target) break;
      path = bfsPath(state, state.player, target, mode === 'stealth');
      if (!path) path = bfsPath(state, state.player, target, false);
      waypoint = 1;
      replanIn = 30;
    }
    if (!path || waypoint >= path.length) {
      // Standing on the target tile: wait a beat (a door may need picking).
      stepWorld(state, { moveX: 0, moveY: 0, sneak: mode === 'stealth', interact: true, dash: false, coin: null }, STEP);
      continue;
    }
    const point = path[waypoint];
    const dx = point.x - state.player.x;
    const dy = point.y - state.player.y;
    if (Math.hypot(dx, dy) < 7) {
      waypoint += 1;
      continue;
    }
    const len = Math.hypot(dx, dy);
    const doorAhead = state.level.doors.size > 0
      && [...state.level.doors.values()].some((door) => !door.open
        && Math.hypot(door.x - point.x, door.y - point.y) < TILE * 0.6);
    stepWorld(state, {
      moveX: dx / len, moveY: dy / len,
      sneak: mode === 'stealth',
      interact: doorAhead || (target && target.kind === 'S' && Math.hypot(target.x - state.player.x, target.y - state.player.y) < TILE * 1.15),
      dash: false, coin: null,
    }, STEP);
  }
  return state;
}

/**
 * Run one named shot and return the world to render.
 *  start: level 1, mid-heist — thief crossing the gallery, cones sweeping,
 *         a painting in reach, the alarm meter on screen.
 *  play:  level 2, mid-chase — the alarm is up and a guard is closing in.
 *  end:   level 1 cleared — the LEVEL CLEAR panel over the gallery.
 */
export function runShot(name) {
  if (name === 'play') {
    const state = createWorld(1);
    drive(state, 'bold', (s) => s.alarm >= 22 || s.guards.some((g) => g.state === 'chase'), 120);
    // Let the chase develop for another second so the frame reads as a chase.
    for (let i = 0; i < 60; i += 1) {
      if (state.status !== 'playing') break;
      stepWorld(state, { moveX: 0, moveY: -1, sneak: false, interact: false, dash: false, coin: null }, STEP);
    }
    return { state, overlay: 'none' };
  }
  if (name === 'end') {
    let state = createWorld(0);
    for (let attempt = 0; attempt < 3 && state.status !== 'cleared'; attempt += 1) {
      drive(state, 'stealth', (s) => s.status === 'cleared', 150);
      if (state.status === 'caught') {
        respawnPlayer(state);
      }
    }
    return { state, overlay: state.status === 'cleared' ? 'cleared' : 'none' };
  }
  // start (default): sneak to the second loot, stop once the thief is deep
  // in the room with a guard cone in frame.
  const state = createWorld(0);
  drive(state, 'stealth', (s, step) => {
    const taken = s.level.loot.filter((i) => i.taken).length;
    return (taken >= 1 && step > 60 * 6) || step > 60 * 25;
  }, 60);
  return { state, overlay: 'none' };
}
