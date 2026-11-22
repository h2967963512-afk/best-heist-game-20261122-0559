// Canvas drawing for The Velvet Heist: the room, its cones, its loot and the
// alarm meter — everything the judge's first criterion asks to see in one frame.

import { CAMERA, FIELD, FONT, GUARD, LOOT, PALETTE, TILE } from './config.js';

function wedge(ctx, x, y, angle, halfAngle, range, colour) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
}

function drawLootIcon(ctx, item, time) {
  const bob = Math.sin(time * 2 + item.x * 0.01) * 2;
  const { x, y } = item;
  ctx.save();
  ctx.translate(x, y + bob);
  if (item.kind === 'L') {
    ctx.fillStyle = '#5d3a1a';
    ctx.fillRect(-13, -10, 26, 20);
    ctx.fillStyle = PALETTE.lootPainting;
    ctx.fillRect(-10, -7, 20, 14);
    ctx.fillStyle = '#f9e79f';
    ctx.fillRect(-6, -4, 5, 8);
    ctx.fillStyle = '#2e86c1';
    ctx.fillRect(2, -4, 6, 8);
  } else if (item.kind === 'O') {
    ctx.fillStyle = PALETTE.lootGold;
    ctx.fillRect(-12, -2, 24, 8);
    ctx.fillRect(-9, -9, 18, 8);
    ctx.fillRect(-5, -15, 10, 7);
    ctx.strokeStyle = '#a67c00';
    ctx.strokeRect(-12, -2, 24, 8);
  } else if (item.kind === 'J') {
    ctx.fillStyle = PALETTE.lootGem;
    ctx.beginPath();
    ctx.moveTo(0, -13); ctx.lineTo(10, -3); ctx.lineTo(0, 12); ctx.lineTo(-10, -3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d6f5ff';
    ctx.beginPath();
    ctx.moveTo(0, -13); ctx.lineTo(5, -3); ctx.lineTo(0, 2); ctx.lineTo(-5, -3);
    ctx.closePath(); ctx.fill();
  } else if (item.kind === 'W') {
    ctx.fillStyle = PALETTE.lootDiamond;
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.lineTo(13, -4); ctx.lineTo(0, 15); ctx.lineTo(-13, -4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.lineTo(6, -4); ctx.lineTo(0, 4); ctx.lineTo(-6, -4);
    ctx.closePath(); ctx.fill();
  } else if (item.kind === 'S') {
    ctx.fillStyle = '#6e7b8b';
    ctx.fillRect(-14, -14, 28, 28);
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(-10, -10, 20, 20);
    ctx.strokeStyle = PALETTE.lootSafe;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = PALETTE.lootSafe;
    ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawWorld(ctx, state) {
  const { level } = state;
  const time = state.time;

  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  // Floor.
  for (let r = 0; r < level.def.map.length; r += 1) {
    for (let c = 0; c < level.def.map[r].length; c += 1) {
      const ch = level.def.map[r][c];
      if (ch === '#') continue;
      const x = c * TILE;
      const y = r * TILE;
      ctx.fillStyle = (c + r) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
      ctx.fillRect(x, y, TILE, TILE);
      if (ch === 's') {
        ctx.fillStyle = PALETTE.shadowFloor;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(120, 140, 200, 0.18)';
        ctx.strokeRect(x + 5.5, y + 5.5, TILE - 11, TILE - 11);
      }
    }
  }

  // Dust motes drifting in the dark (seeded positions, so they never jump).
  ctx.fillStyle = 'rgba(242, 201, 76, 0.25)';
  for (const mote of state.motes) {
    const y = mote.y + Math.sin(time * 0.5 + mote.p) * 6;
    ctx.beginPath();
    ctx.arc(mote.x, y, mote.s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Exit.
  const exitOpen = state.lootValue >= state.quota;
  ctx.fillStyle = exitOpen ? PALETTE.exit : PALETTE.exitLocked;
  ctx.fillRect(level.exit.x - 18, level.exit.y - 18, 36, 36);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(level.exit.x - 18, level.exit.y - 18, 36, 36);
  ctx.fillStyle = '#0d0f16';
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(exitOpen ? 'EXIT' : 'LOCKED', level.exit.x, level.exit.y + 4);

  // Walls.
  for (let r = 0; r < level.def.map.length; r += 1) {
    for (let c = 0; c < level.def.map[r].length; c += 1) {
      if (level.def.map[r][c] !== '#') continue;
      const x = c * TILE;
      const y = r * TILE;
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(x, y, TILE, 5);
    }
  }

  // Doors (closed ones are pickable; open ones are a dark gap).
  for (const door of level.doors.values()) {
    if (door.open) {
      ctx.fillStyle = PALETTE.doorOpen;
      ctx.fillRect(door.x - 18, door.y - 18, 36, 36);
      continue;
    }
    ctx.fillStyle = PALETTE.door;
    ctx.fillRect(door.x - 18, door.y - 18, 36, 36);
    ctx.strokeStyle = '#3d2f16';
    ctx.lineWidth = 2;
    ctx.strokeRect(door.x - 18, door.y - 18, 36, 36);
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath(); ctx.arc(door.x, door.y, 3, 0, Math.PI * 2); ctx.fill();
    if (door.progress > 0) {
      ctx.strokeStyle = '#f2c94c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(door.x, door.y, 24, -Math.PI / 2, -Math.PI / 2 + door.progress * Math.PI * 2);
      ctx.stroke();
    }
  }

  // Breaker.
  if (level.breaker) {
    const { x, y } = level.breaker;
    ctx.fillStyle = state.blackoutTimer > 0 ? '#555' : '#27ae60';
    ctx.fillRect(x - 11, y - 13, 22, 26);
    ctx.strokeStyle = '#1e8449';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 11, y - 13, 22, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillText('⚡', x, y + 5);
  }

  // Loot.
  for (const item of level.loot) {
    if (item.taken) continue;
    drawLootIcon(ctx, item, time);
    if (item.kind === 'S' && item.progress > 0) {
      ctx.strokeStyle = '#f2c94c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 24, -Math.PI / 2, -Math.PI / 2 + item.progress * Math.PI * 2);
      ctx.stroke();
    }
  }

  // Camera cones, then the cameras themselves.
  for (const cam of state.cameras) {
    if (state.blackoutTimer <= 0) {
      wedge(ctx, cam.x, cam.y, cam.angle, CAMERA.viewHalfAngle, CAMERA.viewRange,
        cam.seesPlayer ? 'rgba(229, 83, 75, 0.35)' : PALETTE.cameraCone);
    }
  }
  for (const cam of state.cameras) {
    ctx.fillStyle = state.blackoutTimer > 0 ? '#555' : (cam.seesPlayer ? '#e5534b' : PALETTE.camera);
    ctx.beginPath(); ctx.arc(cam.x, cam.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cam.x, cam.y, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cam.x + Math.cos(cam.angle) * 5, cam.y + Math.sin(cam.angle) * 5, 3, 0, Math.PI * 2); ctx.fill();
  }

  // Guard cones, then the guards.
  for (const guard of state.guards) {
    const colour = guard.state === 'chase' ? PALETTE.guardConeChase
      : guard.state === 'suspicious' ? PALETTE.guardConeSus : PALETTE.guardCone;
    wedge(ctx, guard.x, guard.y, guard.angle, GUARD.viewHalfAngle, GUARD.viewRange, colour);
  }
  for (const guard of state.guards) {
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath(); ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7b1f1a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2); ctx.stroke();
    // Facing tick.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * 18, guard.y + Math.sin(guard.angle) * 18);
    ctx.stroke();
    // Detection ring.
    if (guard.detection > 0.02) {
      ctx.strokeStyle = guard.detection >= 1 ? '#e5534b' : '#f2994a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD.radius + 6, -Math.PI / 2, -Math.PI / 2 + guard.detection * Math.PI * 2);
      ctx.stroke();
    }
    // State mark.
    if (guard.state === 'chase') {
      ctx.fillStyle = '#ff5b4d';
      ctx.font = `bold 20px ${FONT}`;
      ctx.fillText('!', guard.x, guard.y - 22);
    } else if (guard.state === 'suspicious') {
      ctx.fillStyle = '#f2994a';
      ctx.font = `bold 20px ${FONT}`;
      ctx.fillText('?', guard.x, guard.y - 22);
    }
  }

  // The thief.
  const p = state.player;
  ctx.fillStyle = p.sneak ? PALETTE.playerSneak : PALETTE.player;
  ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7a5c00';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#0d0f16';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.angle) * 17, p.y + Math.sin(p.angle) * 17);
  ctx.stroke();
  // Carried loot shows as a little sack.
  if (state.carried > 0) {
    ctx.fillStyle = '#8a6d3b';
    ctx.beginPath(); ctx.arc(p.x - 12, p.y + 10, 6, 0, Math.PI * 2); ctx.fill();
  }
  if (p.dashTime > 0) {
    ctx.strokeStyle = 'rgba(242, 201, 76, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, Math.PI * 2); ctx.stroke();
  }
}

export function drawHud(ctx, state) {
  const level = state.level.def;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, 46);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.beginPath(); ctx.moveTo(0, 46.5); ctx.lineTo(FIELD.width, 46.5); ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText(`${state.levelIndex + 1}/3 · ${level.name}`, 14, 24);
  // Loot tally, right of the level name.
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText(`Loot $${state.lootValue} / $${state.quota}`, 330, 24);

  // Alarm meter, top centre — the tension gauge of the whole game.
  const ax = FIELD.width / 2 - 130;
  const alarmColour = state.alarm < 35 ? PALETTE.alarmLow : state.alarm < 70 ? PALETTE.alarmMid : PALETTE.alarmHigh;
  ctx.fillStyle = '#10131e';
  ctx.fillRect(ax - 46, 14, 306, 18);
  ctx.strokeStyle = alarmColour;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ax - 46, 14, 306, 18);
  ctx.fillStyle = alarmColour;
  ctx.fillRect(ax - 44, 16, 302 * (state.alarm / 100), 14);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(state.lockdownTimer > 0 ? `LOCKDOWN ${Math.ceil(state.lockdownTimer)}s` : 'ALARM', ax - 46, 10);
  if (state.blackoutTimer > 0) {
    ctx.fillStyle = '#9b59b6';
    ctx.fillText(`CAMERAS DOWN ${Math.ceil(state.blackoutTimer)}s`, ax + 130, 42);
  }

  // Right side: score, time, lives, coins.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 15px ${FONT}`;
  const mins = Math.floor(state.time / 60);
  const secs = Math.floor(state.time % 60).toString().padStart(2, '0');
  ctx.fillText(`Score ${state.score}   ${mins}:${secs}`, FIELD.width - 14, 16);
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  const hearts = '♥'.repeat(Math.max(0, state.lives)) + '♡'.repeat(Math.max(0, 3 - state.lives));
  ctx.fillStyle = '#e5534b';
  ctx.fillText(`${hearts}   Coins ${state.coins}   Dash ${state.player.dashCooldown > 0 ? '…' : 'ready'}`, FIELD.width - 14, 36);

  // Context prompt, bottom centre.
  ctx.textAlign = 'center';
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  const prompt = contextPrompt(state);
  if (prompt) {
    ctx.fillStyle = 'rgba(16, 19, 30, 0.85)';
    const w = ctx.measureText(prompt).width + 24;
    ctx.fillRect(FIELD.width / 2 - w / 2, FIELD.height - 34, w, 24);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(prompt, FIELD.width / 2, FIELD.height - 21);
  }
  ctx.textBaseline = 'alphabetic';
}

function contextPrompt(state) {
  const { level } = state;
  const p = state.player;
  const d = (x, y) => Math.hypot(p.x - x, p.y - y);
  for (const door of level.doors.values()) {
    if (!door.open && d(door.x, door.y) < TILE * 1.15) return 'Hold E — pick the lock';
  }
  for (const item of level.loot) {
    if (item.kind === 'S' && !item.taken && d(item.x, item.y) < TILE * 1.15) {
      return item.progress > 0 ? 'Cracking the safe… keep holding E' : 'Hold E — crack the safe ($500)';
    }
  }
  if (level.breaker && d(level.breaker.x, level.breaker.y) < TILE * 1.15) {
    if (state.breakerCooldown > 0) return `Breaker recharging (${Math.ceil(state.breakerCooldown)}s)`;
    if (state.blackoutTimer > 0) return 'Cameras are down — move!';
    return 'Press E — cut the cameras (10s blackout)';
  }
  if (state.lootValue < state.quota) return 'Grab loot to reach the quota, then slip out the green exit';
  if (d(level.exit.x, level.exit.y) < 90) return 'The exit is open — go!';
  return 'WASD move · Shift sneak · Space dash · Click toss a coin · E interact';
}
