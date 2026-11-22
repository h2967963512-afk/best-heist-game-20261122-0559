// The Velvet Heist: pure simulation. No DOM, no canvas, no Math.random —
// the browser shell (main.js) and the test scripts both drive stepWorld.
// Everything random-looking comes from the level's fixed seed.

import {
  ALARM, CAMERA, COLS, COINS, GUARD, LIVES, LOOT, PLAYER, ROWS, SCORE, STEP, TILE,
} from './config.js';
import { LEVELS, LOOT_NAME, LOOT_VALUE } from './levels.js';
import { createRandom } from './random.js';

const key = (c, r) => `${c},${r}`;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const tileCenter = (c, r) => ({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE });

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Line of sight on the tile grid: true when no wall tile stands between the two points. */
export function hasLineOfSight(level, ax, ay, bx, by) {
  const steps = Math.ceil(dist(ax, ay, bx, by) / 8);
  for (let i = 1; i < steps; i += 1) {
    const x = ax + ((bx - ax) * i) / steps;
    const y = ay + ((by - ay) * i) / steps;
    if (level.solids.has(key(Math.floor(x / TILE), Math.floor(y / TILE)))) return false;
  }
  return true;
}

/** Is the point inside the watcher's cone and visible? Returns 0 when not seen. */
function coneFactor(level, wx, wy, angle, range, halfAngle, tx, ty) {
  const d = dist(wx, wy, tx, ty);
  if (d > range) return 0;
  const toTarget = Math.atan2(ty - wy, tx - wx);
  if (Math.abs(angleDiff(toTarget, angle)) > halfAngle) return 0;
  if (!hasLineOfSight(level, wx, wy, tx, ty)) return 0;
  // Closer and more centred fills the meter faster.
  const closeness = 1 - (d / range) * 0.55;
  const centred = 1 - Math.abs(angleDiff(toTarget, angle)) / halfAngle;
  return closeness * (0.55 + 0.45 * centred);
}

function parseLevel(def) {
  const level = {
    def,
    solids: new Set(),
    shadow: new Set(),
    doors: new Map(),
    loot: [],
    breaker: null,
    start: { x: 60, y: 60 },
    exit: { x: 0, y: 0 },
    totalLoot: 0,
  };
  def.map.forEach((row, r) => {
    for (let c = 0; c < row.length; c += 1) {
      const ch = row[c];
      const centre = tileCenter(c, r);
      if (ch === '#') level.solids.add(key(c, r));
      else if (ch === 's') level.shadow.add(key(c, r));
      else if (ch === 'D') {
        level.solids.add(key(c, r));
        level.doors.set(key(c, r), { c, r, x: centre.x, y: centre.y, open: false, progress: 0 });
      } else if (ch === 'P') level.start = centre;
      else if (ch === 'X') level.exit = centre;
      else if (ch === 'B') level.breaker = centre;
      else if (LOOT_VALUE[ch]) {
        level.loot.push({
          id: `${ch}${c}-${r}`, kind: ch, name: LOOT_NAME[ch], value: LOOT_VALUE[ch],
          x: centre.x, y: centre.y, taken: false,
        });
        level.totalLoot += LOOT_VALUE[ch];
      }
    }
  });
  return level;
}

export function createWorld(levelIndex, lives = LIVES, score = 0, coins = COINS) {
  const def = LEVELS[levelIndex];
  const level = parseLevel(def);
  const rng = createRandom(def.seed);
  // A few deterministic dust motes for atmosphere; positions come from the seed.
  const motes = [];
  for (let i = 0; i < 40; i += 1) {
    motes.push({ x: rng() * COLS * TILE, y: rng() * ROWS * TILE, s: 1 + rng() * 1.6, p: rng() * Math.PI * 2 });
  }
  const guards = def.guards.map((g) => {
    const first = tileCenter(g.waypoints[0][0], g.waypoints[0][1]);
    const second = tileCenter(g.waypoints[1][0], g.waypoints[1][1]);
    return {
      x: first.x, y: first.y,
      angle: Math.atan2(second.y - first.y, second.x - first.x),
      waypoints: g.waypoints.map(([c, r]) => tileCenter(c, r)),
      waypointIndex: 1,
      pauseTimer: 0,
      state: 'patrol',
      detection: 0,
      lastSeen: { x: first.x, y: first.y },
      investigateTimer: 0,
      chaseTimer: 0,
      heardAt: null,
    };
  });
  const cameras = def.cameras.map((cam) => {
    const centre = tileCenter(cam.c, cam.r);
    return {
      x: centre.x, y: centre.y, base: cam.base, sweep: cam.sweep, period: cam.period,
      angle: cam.base, seesPlayer: false,
    };
  });
  return {
    levelIndex,
    level,
    motes,
    player: {
      x: level.start.x, y: level.start.y, angle: 0,
      dashTime: 0, dashCooldown: 0, sneak: false,
    },
    guards,
    cameras,
    lives,
    score,
    coins,
    lootValue: 0,
    carried: 0,
    quota: Math.ceil(level.totalLoot * LOOT.quotaFraction),
    time: 0,
    alarm: 0,
    lockdownTimer: 0,
    blackoutTimer: 0,
    breakerCooldown: 0,
    ghost: true,
    status: 'playing',
    statusReason: '',
    levelScore: 0,
    caughtCount: 0,
  };
}

function circleHitsSolid(level, x, y, radius) {
  const c0 = Math.floor((x - radius) / TILE);
  const c1 = Math.floor((x + radius) / TILE);
  const r0 = Math.floor((y - radius) / TILE);
  const r1 = Math.floor((y + radius) / TILE);
  for (let r = r0; r <= r1; r += 1) {
    for (let c = c0; c <= c1; c += 1) {
      if (!level.solids.has(key(c, r))) continue;
      const nx = clamp(x, c * TILE, (c + 1) * TILE);
      const ny = clamp(y, r * TILE, (r + 1) * TILE);
      if ((x - nx) ** 2 + (y - ny) ** 2 < radius * radius) return true;
    }
  }
  return false;
}

function moveCircle(level, body, dx, dy, radius) {
  if (dx !== 0 && !circleHitsSolid(level, body.x + dx, body.y, radius)) body.x += dx;
  if (dy !== 0 && !circleHitsSolid(level, body.x, body.y + dy, radius)) body.y += dy;
}

function nearestDoor(level, x, y, range) {
  let best = null;
  let bestD = range;
  for (const door of level.doors.values()) {
    if (door.open) continue;
    const d = dist(x, y, door.x, door.y);
    if (d < bestD) { best = door; bestD = d; }
  }
  return best;
}

function nearestSafe(level, x, y, range) {
  let best = null;
  let bestD = range;
  for (const item of level.loot) {
    if (item.kind !== 'S' || item.taken) continue;
    const d = dist(x, y, item.x, item.y);
    if (d < bestD) { best = item; bestD = d; }
  }
  return best;
}

export function respawnPlayer(state) {
  state.player.x = state.level.start.x;
  state.player.y = state.level.start.y;
  state.player.dashTime = 0;
  state.player.dashCooldown = 0;
  for (const guard of state.guards) {
    const first = guard.waypoints[0];
    guard.x = first.x;
    guard.y = first.y;
    guard.waypointIndex = 1;
    guard.state = 'patrol';
    guard.detection = 0;
    guard.pauseTimer = 0;
    guard.heardAt = null;
  }
  state.alarm = Math.max(0, state.alarm - 35);
  state.lockdownTimer = 0;
  state.status = 'playing';
  state.statusReason = '';
}

/**
 * Advance the world one fixed step. `input` is
 * { moveX, moveY, sneak, interact, dash, coin } where coin is {x, y} or null
 * and dash is true only on the frame the key is pressed.
 * Returns the events that happened this step.
 */
export function stepWorld(state, input, dt = STEP) {
  const events = [];
  if (state.status !== 'playing') return events;
  const { level } = state;
  const p = state.player;
  state.time += dt;

  // --- timers ---
  if (p.dashCooldown > 0) p.dashCooldown -= dt;
  if (p.dashTime > 0) p.dashTime -= dt;
  if (state.blackoutTimer > 0) state.blackoutTimer -= dt;
  if (state.breakerCooldown > 0) state.breakerCooldown -= dt;
  if (state.lockdownTimer > 0) {
    state.lockdownTimer -= dt;
    if (state.lockdownTimer <= 0) {
      state.alarm = ALARM.lockdownReset;
      events.push({ type: 'lockdownEnd' });
      for (const guard of state.guards) {
        if (guard.state === 'chase') guard.state = 'suspicious';
      }
    }
  }

  // --- player movement ---
  p.sneak = !!input.sneak;
  const speedFactor = Math.max(PLAYER.minSpeedFactor, 1 - PLAYER.weightPerLoot * state.carried);
  let speed = (p.sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed) * speedFactor;
  if (input.dash && p.dashCooldown <= 0 && p.dashTime <= 0) {
    p.dashTime = PLAYER.dashTime;
    p.dashCooldown = PLAYER.dashCooldown;
    events.push({ type: 'dash' });
    // A dash is loud: every guard close by turns toward the noise.
    for (const guard of state.guards) {
      if (dist(p.x, p.y, guard.x, guard.y) < 220) {
        guard.heardAt = { x: p.x, y: p.y };
        if (guard.state === 'patrol') guard.state = 'suspicious';
      }
    }
  }
  if (p.dashTime > 0) speed = PLAYER.dashSpeed;
  const len = Math.hypot(input.moveX || 0, input.moveY || 0);
  if (len > 0.01) {
    const nx = (input.moveX || 0) / Math.max(1, len);
    const ny = (input.moveY || 0) / Math.max(1, len);
    p.angle = Math.atan2(ny, nx);
    moveCircle(level, p, nx * speed * dt, ny * speed * dt, PLAYER.radius);
  }

  // --- coin toss: guards go investigate where it lands ---
  if (input.coin) {
    state.coins -= 1;
    events.push({ type: 'coin', x: input.coin.x, y: input.coin.y });
    for (const guard of state.guards) {
      if (dist(input.coin.x, input.coin.y, guard.x, guard.y) < 320) {
        guard.heardAt = { x: input.coin.x, y: input.coin.y };
        guard.lastSeen = { x: input.coin.x, y: input.coin.y };
        if (guard.state !== 'chase') {
          guard.state = 'suspicious';
          guard.investigateTimer = GUARD.investigateTime;
        }
      }
    }
  }

  // --- interaction: lockpick a door, crack a safe, cut the breaker ---
  const door = nearestDoor(level, p.x, p.y, TILE * 1.15);
  const safe = nearestSafe(level, p.x, p.y, TILE * 1.15);
  if (input.interact) {
    if (door) {
      door.progress += dt / PLAYER.lockpickTime;
      if (door.progress >= 1) {
        door.open = true;
        level.solids.delete(key(door.c, door.r));
        events.push({ type: 'door', c: door.c, r: door.r });
      }
    } else if (safe) {
      safe.progress = (safe.progress || 0) + dt / PLAYER.safeTime;
      if (safe.progress >= 1 && !safe.taken) {
        safe.taken = true;
        state.lootValue += safe.value;
        state.carried += 1;
        state.score += safe.value;
        events.push({ type: 'loot', name: safe.name, value: safe.value, x: safe.x, y: safe.y });
      }
    } else if (level.breaker && dist(p.x, p.y, level.breaker.x, level.breaker.y) < TILE * 1.15
      && state.breakerCooldown <= 0 && state.blackoutTimer <= 0) {
      state.blackoutTimer = CAMERA.blackoutTime;
      state.breakerCooldown = CAMERA.breakerCooldown;
      events.push({ type: 'breaker' });
    }
  } else {
    if (door) door.progress = Math.max(0, door.progress - dt / PLAYER.lockpickTime);
    if (safe) safe.progress = Math.max(0, (safe.progress || 0) - dt / PLAYER.safeTime);
  }

  // --- walk-over loot ---
  for (const item of level.loot) {
    if (item.taken || item.kind === 'S') continue;
    if (dist(p.x, p.y, item.x, item.y) < 26) {
      item.taken = true;
      state.lootValue += item.value;
      state.carried += 1;
      state.score += item.value;
      events.push({ type: 'loot', name: item.name, value: item.value, x: item.x, y: item.y });
    }
  }

  // --- cameras ---
  let cameraSees = false;
  for (const cam of state.cameras) {
    cam.angle = cam.base + Math.sin((state.time * Math.PI * 2) / cam.period) * cam.sweep;
    cam.seesPlayer = false;
    if (state.blackoutTimer > 0) continue;
    const f = coneFactor(level, cam.x, cam.y, cam.angle, CAMERA.viewRange, CAMERA.viewHalfAngle, p.x, p.y);
    if (f > 0) {
      cam.seesPlayer = true;
      cameraSees = true;
      state.ghost = false;
    }
  }

  // --- guards ---
  let anyGuardSees = false;
  let anyChase = false;
  for (const guard of state.guards) {
    const onShadow = level.shadow.has(key(Math.floor(p.x / TILE), Math.floor(p.y / TILE)));
    const f = coneFactor(level, guard.x, guard.y, guard.angle, GUARD.viewRange, GUARD.viewHalfAngle, p.x, p.y);
    let seen = false;
    if (f > 0) {
      seen = true;
      anyGuardSees = true;
      let rate = GUARD.detectRate * f;
      if (p.sneak) rate *= 0.5;
      if (onShadow) rate *= 0.45;
      if (p.dashTime > 0) rate *= 1.5;
      guard.detection = clamp(guard.detection + rate * dt, 0, 1);
      guard.lastSeen = { x: p.x, y: p.y };
      if (guard.detection >= 1 && guard.state !== 'chase') {
        guard.state = 'chase';
        guard.chaseTimer = GUARD.chaseMemory;
        state.ghost = false;
        events.push({ type: 'spotted' });
      } else if (guard.detection >= GUARD.suspectAt && guard.state === 'patrol') {
        guard.state = 'suspicious';
        guard.investigateTimer = GUARD.investigateTime;
        state.ghost = false;
      }
    } else {
      guard.detection = clamp(guard.detection - 0.35 * dt, 0, 1);
    }

    // Movement by state.
    if (guard.state === 'patrol') {
      const target = guard.waypoints[guard.waypointIndex];
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
      } else if (dist(guard.x, guard.y, target.x, target.y) < 8) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = 0.8;
        const next = guard.waypoints[guard.waypointIndex];
        guard.angle = Math.atan2(next.y - guard.y, next.x - guard.x);
      } else {
        const a = Math.atan2(target.y - guard.y, target.x - guard.x);
        guard.angle = a;
        moveCircle(level, guard, Math.cos(a) * GUARD.patrolSpeed * dt, Math.sin(a) * GUARD.patrolSpeed * dt, GUARD.radius);
      }
    } else if (guard.state === 'suspicious') {
      const target = guard.heardAt || guard.lastSeen;
      if (dist(guard.x, guard.y, target.x, target.y) < 10) {
        guard.investigateTimer -= dt;
        guard.angle += Math.sin(state.time * 2 + guard.x) * 0.02;
        if (guard.investigateTimer <= 0) {
          guard.state = 'patrol';
          guard.heardAt = null;
          guard.detection = Math.min(guard.detection, GUARD.suspectAt - 0.05);
        }
      } else {
        const a = Math.atan2(target.y - guard.y, target.x - guard.x);
        guard.angle = a;
        moveCircle(level, guard, Math.cos(a) * GUARD.suspiciousSpeed * dt, Math.sin(a) * GUARD.suspiciousSpeed * dt, GUARD.radius);
      }
    } else if (guard.state === 'chase') {
      anyChase = true;
      const target = seen ? { x: p.x, y: p.y } : guard.lastSeen;
      if (!seen) {
        guard.chaseTimer -= dt;
        if (guard.chaseTimer <= 0) {
          guard.state = 'suspicious';
          guard.investigateTimer = GUARD.investigateTime;
        }
      } else {
        guard.chaseTimer = GUARD.chaseMemory;
      }
      const a = Math.atan2(target.y - guard.y, target.x - guard.x);
      guard.angle = a;
      const chaseSpeed = state.lockdownTimer > 0 ? GUARD.chaseSpeed * 1.15 : GUARD.chaseSpeed;
      moveCircle(level, guard, Math.cos(a) * chaseSpeed * dt, Math.sin(a) * chaseSpeed * dt, GUARD.radius);
      if (dist(guard.x, guard.y, p.x, p.y) < GUARD.catchRange) {
        state.lives -= 1;
        state.caughtCount += 1;
        events.push({ type: 'caught', lives: state.lives });
        if (state.lives <= 0) {
          state.status = 'failed';
          state.statusReason = 'The crew is in custody. The vault keeps its secrets.';
        } else {
          state.status = 'caught';
          state.statusReason = 'Spotted and grabbed. The crew pulls you out — one life lost.';
        }
        return events;
      }
    }
  }

  // --- alarm ---
  if (state.lockdownTimer <= 0) {
    if (anyChase || anyGuardSees) state.alarm = clamp(state.alarm + ALARM.riseRate * dt, 0, ALARM.max);
    if (cameraSees) state.alarm = clamp(state.alarm + CAMERA.alarmRate * dt, 0, ALARM.max);
    if (!anyChase && !anyGuardSees && !cameraSees) state.alarm = clamp(state.alarm - ALARM.fallRate * dt, 0, ALARM.max);
    if (state.alarm >= ALARM.max) {
      state.lockdownTimer = ALARM.lockdownTime;
      events.push({ type: 'lockdown' });
      for (const guard of state.guards) {
        guard.state = 'chase';
        guard.lastSeen = { x: p.x, y: p.y };
        guard.chaseTimer = ALARM.lockdownTime;
      }
    }
  }

  // --- exit: open once the quota is met, leave through it to clear the level ---
  if (state.lootValue >= state.quota && dist(p.x, p.y, state.level.exit.x, state.level.exit.y) < 28) {
    const timeBonus = Math.max(0, SCORE.timeBonusMax - Math.max(0, state.time - LEVELS[state.levelIndex].par) * SCORE.timePenaltyPerSecond);
    const ghostBonus = state.ghost ? SCORE.ghostBonus : 0;
    state.levelScore = SCORE.clearBonus + Math.round(timeBonus) + ghostBonus;
    state.score += state.levelScore;
    state.status = 'cleared';
    state.statusReason = LEVELS[state.levelIndex].name;
    events.push({ type: 'cleared', levelScore: state.levelScore, ghost: state.ghost });
  }

  return events;
}
